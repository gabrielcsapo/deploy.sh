import mongoose from "mongoose";
import http from "http";
import fs from "fs";
import path from "path";
import Docker from "dockerode";
const docker = new Docker({
  socketPath: "/var/run/docker.sock",
});
import stream from "stream";

const Schema = mongoose.Schema;

import User from "./user.js";
import Request from "./request.js";

import { hash, rm } from "../helpers/util.js";

const DeploymentSchema = new Schema(
  {
    id: String,
    name: String,
    port: Number,
    subdomain: String,
    directory: String,
    username: String,
  },
  {
    minimize: false,
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

const DeploymentModel = mongoose.model("Deployment", DeploymentSchema);

/**
 * Deployment definition
 * @class Deployment
 * @property {String} id - the container id
 * @property {String} name - the name of the deployment
 * @property {Number} port - the port that the container has exposed
 * @property {String} subdomain - the subdomain of the application
 * @property {String} directory - the directory of tared application
 * @property {String} username - the username who owns the deployment
 */
class Deployment {
  /**
   * updates a deployment
   * @method update
   * @memberof Deployment
   * @param  {Object} options
   * @param  {String} options.name       - the name of the deployment
   * @param  {String} options.username   - the username associated with this deployment
   * @return {Promise}
   */
  static async update({ name, token, username, deployment }) {
    let user = await User.authenticate(username, token);

    let found = await DeploymentModel.findOne({
      username: user.username,
      name,
    });

    if (found) {
      found.id = deployment.id || found.id;
      found.name = deployment.name || found.name;
      found.port = deployment.port || found.port;
      found.subdomain = deployment.subdomain || found.subdomain;
      found.directory = deployment.directory || found.directory;
      found.username = user.username;

      await found.save();

      return found;
    } else {
      const deployment = {
        name,
        subdomain: `${name}-${hash(6)}`,
        username: user.username,
      };
      return await DeploymentModel.create(deployment);
    }
  }
  /**
   * deletes the specified deployment from the user
   * @method del
   * @memberof Deployment
   * @param  {String} name     - the name of the deployment
   * @param  {String} options.token      - the token for the user who owns the deployment
   * @param  {String} options.username   - the username associated with this deployment
   * @return {Promise}
   */
  static async del({ name, username, token }) {
    const user = await User.authenticate(username, token);

    const deployment = await DeploymentModel.findOne({
      username: user.username,
      name,
    });

    await rm(deployment.directory);

    await Deployment.remove({
      subdomain: deployment.subdomain,
      token,
      username: user.username,
    });

    await deployment.deleteOne();

    await Request.del({
      subdomain: deployment.subdomain,
    });
  }
  /**
   * express middleware to proxy to correct container
   * @method proxy
   * @memberof Deployment
   * @param  {String} subdomain - the subdomain for the application being requested
   * @return {Promise}
   */
  static async proxy(req, res) {
    const { url, method, headers } = req;
    const { host } = headers;

    // If this is not an upload request, it is a proxy request
    const subdomain = host.split(".")[0];

    let deployment = await DeploymentModel.findOne({
      subdomain: {
        $eq: subdomain,
      },
    });

    if (!deployment) {
      return res
        .status(404)
        .sendFile(new URL("../static/not-found.html", import.meta.url));
    }

    const { port } = deployment;
    const proxy = http.request({
      method,
      path: url,
      headers,
      port,
      host: "localhost",
    });
    proxy.addListener("response", function (proxy_response) {
      proxy_response.addListener("data", (chunk) => res.write(chunk, "binary"));
      proxy_response.addListener("end", () => res.end());
      res.writeHead(proxy_response.statusCode, proxy_response.headers);
    });
    proxy.on("error", () => {
      res
        .status(502)
        .sendFile(
          new URL("../static/page-could-not-load.html", import.meta.url)
        );
    });
    req.addListener("data", (chunk) => proxy.write(chunk, "binary"));
    req.addListener("end", () => proxy.end());
  }
  /**
   * decorates a deployment with the correct data on get
   * @method decorate
   * @memberof Deployment
   * @param  {Deployment} deployment - a deployment instance
   * @return {Promise}
   */
  static async decorate(deployment) {
    let requests = await Request.count({ subdomain: deployment.subdomain });

    deployment.requests = requests || 0;

    const container = docker.getContainer(deployment.id);

    try {
      let info = await container.inspect();

      deployment.status = info.State.Status;
    } catch (ex) {
      deployment.status = "error";
    }

    return deployment;
  }
  /**
   * gets a specific deployment for the specified user
   * @method get
   * @memberof Deployment
   * @param  {Object}  options
   * @param  {String} options.name     - the name of the deployment
   * @param  {String} options.token      - the token for the user who owns the deployment
   * @param  {String} options.username   - the username associated with this deployment
   * @param  {Boolean} option.create - create a deployment if not found
   * @return {Promise}
   */
  static async get({ name, token, username, create }) {
    let user = await User.authenticate(username, token);

    let deployment = await DeploymentModel.findOne({
      username: user.username,
      name,
    });

    if (deployment) {
      return await Deployment.decorate(deployment._doc);
    }

    if (create) {
      // add a new deployment name
      // TODO: figure out how to avoid collisions
      return await DeploymentModel.create({
        name,
        subdomain: `${name}-${hash(6)}`,
        username: user.username,
      });
    }
  }
  /**
   * gets all deployments for the specified user
   * @method getAll
   * @memberof Deployment
   * @param  {String} options.token      - the token for the user who owns the deployment
   * @param  {String} options.username   - the username associated with this deployment
   * @return {Promise}
   */
  static async getAll({ token, username }) {
    let user = await User.authenticate(username, token);

    let deployments = await DeploymentModel.find({
      username: user.username,
    });

    for (var i = 0; i < deployments.length; i++) {
      deployments[i] = await Deployment.decorate(deployments[i]._doc);
    }

    return deployments;
  }
  static build({ name, subdomain, username, token, port, directory }) {
    function recurse(directory) {
      let files = [];
      fs.readdirSync(directory).map((f) => {
        let stat = fs.statSync(`${directory}/${f}`);
        if (stat.isDirectory()) {
          files = files.concat(recurse(`${directory}/${f}`));
        } else {
          files.push(`${directory}/${f}`);
        }
      });
      return files;
    }
    // we are working off the the relative paths and we need to make the absolute paths relative to context
    let src = recurse(directory).map((f) => f.replace(directory, ""));

    return new Promise(function (resolve, reject) {
      docker.buildImage(
        {
          context: directory,
          src,
        },
        {
          t: subdomain,
        },
        (err, stream) => {
          if (err) return reject(err);
          docker.modem.followProgress(stream, onFinished, onProgress);

          function onFinished(err) {
            if (err) return reject(err);
            docker.createContainer(
              {
                Image: subdomain,
                name: subdomain,
                env: ["PORT=3000"],
                ExposedPorts: {
                  "3000/tcp": {},
                },
                PortBindings: {
                  "3000/tcp": [
                    {
                      HostPort: `${port}`,
                    },
                  ],
                },
                Privileged: true,
              },
              (err, container) => {
                if (err) return reject(err);
                container.start((err) => {
                  if (err) return reject(err);
                  const id = container.id;

                  Deployment.update({
                    name,
                    username,
                    token,
                    deployment: {
                      id,
                      port,
                      directory,
                    },
                  })
                    .then((deployment) => resolve(deployment))
                    .catch((ex) => reject(ex));
                });
              }
            );
          }
          // TODO: be able to stream the output of this to a socket to give real time updates
          function onProgress() {
            // console.log(ev);
          }
        }
      );
    });
  }
  /**
   * starts a container or all containers
   * @method start
   * @memberof Deployment
   * @param  {String=} name - to start a specific container a name property is needed
   * @param  {String} options.token      - the token for the user who owns the deployment
   * @param  {String} options.username   - the username associated with this deployment
   * @return {Promise}
   */
  static async start({ name, username, token }) {
    let opts = {};
    // TODO: check username and token to make sure the request is authenticated
    if (username && token) {
      opts.username = username;
    }

    const deployments = await DeploymentModel.find(opts);

    if (deployments.length === 0) return;

    for (var i = 0; i < deployments.length; i++) {
      const deployment = deployments[i];

      if (name && deployment.name == name) {
        await docker.getContainer(deployment.id).start();
      }
      if (!name) {
        await docker.getContainer(deployment.id).start();
      }
    }
    return deployments;
  }
  /**
   * stops a container or all containers
   * @method stop
   * @memberof Deployment
   * @param  {String=} name - to stop a specific container a name property is needed
   * @param  {String=} options.token      - the token for the user who owns the deployment
   * @param  {String=} options.username   - the username associated with this deployment
   * @return {Promise}
   */
  static async stop({ name, token, username }) {
    let opts = {};
    // TODO: check username and token to make sure the request is authenticated
    if (username && token) {
      opts.username = username;
    }

    const deployments = await DeploymentModel.find(opts);

    if (deployments.length === 0) return;

    for (var i = 0; i < deployments.length; i++) {
      const deployment = deployments[i];

      if (name && deployment.name == name) {
        await docker.getContainer(deployment.id).kill({ force: true });
      }
      if (!name) {
        await docker.getContainer(deployment.id).kill({ force: true });
      }
    }

    return deployments;
  }
  /**
   * retrieves from a given instance
   * @method logs
   * @memberof Deployment
   * @param  {String} name     - instance name
   * @param  {String} token      - the token for the user who owns the deployment
   * @param  {String} username   - the username associated with this deployment
   * @return {Promise}
   */
  static logs({ name, token, username }) {
    return new Promise(async (resolve, reject) => {
      try {
        const user = await User.authenticate(username, token);

        const deployment = await DeploymentModel.findOne({
          name,
          username: user.username,
        });

        const logs = [];
        const container = docker.getContainer(deployment.id);

        const logStream = new stream.PassThrough();

        logStream.on("data", (chunk) => {
          logs.push(chunk.toString("utf8"));
        });

        const cStream = await container.logs({
          follow: true,
          stdout: true,
          stderr: true,
        });

        container.modem.demuxStream(cStream, logStream, logStream);
        cStream.on("end", function () {
          return resolve(logs);
        });

        setTimeout(function () {
          cStream.destroy();

          return resolve(logs);
        }, 2000);
      } catch (ex) {
        return reject(ex);
      }
    });
  }
  /**
   * removes a specific container, will stop and cleanup all necessary files
   * @method remove
   * @memberof Deployment
   * @param  {String} name - the name of the container
   * @param  {String} options.token      - the token for the user who owns the deployment
   * @param  {String} options.username   - the username associated with this deployment
   * @return {Promise}
   */
  static async remove({ subdomain, token, username }) {
    let user = await User.authenticate(username, token);

    let deployment = await DeploymentModel.findOne({
      subdomain: subdomain,
      username: user.username,
    });

    try {
      const container = docker.getContainer(deployment.id);

      await container.kill();

      let info = await container.inspect();

      await docker.getImage(info.Image).remove({
        force: true,
      });
      await container.remove();
    } catch (ex) {
      if (ex.reason !== "no such container") {
        throw new Error(ex);
      }
    }

    return deployment;
  }
}

export default Deployment;
