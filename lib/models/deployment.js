/**
 * @module models/deployment
 */

const Async = require('async');
const mongoose = require('mongoose');
const http = require('http');
const fs = require('fs');
const Docker = require('dockerode');
const docker = new Docker({
  socketPath: '/var/run/docker.sock'
});
const stream = require('stream');

const Schema = mongoose.Schema;

const { authenticate } = require('./user');
const { hash, rm } = require('../helpers/util');
const { count } = require('./request');
const deleteRequests = require('./request').del;

const DeploymentSchema = new Schema({
  id: String,
  name: String,
  port: Number,
  subdomain: String,
  directory: String,
  username: String
}, {
  minimize: false,
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

const Deployment = mongoose.model('Deployment', DeploymentSchema);

/**
 * Deployment definition
 * @class {Object} Deployment
 * @property {String} id - the container id
 * @property {String} name - the name of the deployment
 * @property {Number} port - the port that the container has exposed
 * @property {String} subdomain - the subdomain of the application
 * @property {String} directory - the directory of tared application
 * @property {String} username - the username who owns the deployment
 */
module.exports.Deployment = Deployment;

/**
 * updates a deployment
 * @method update
 * @param  {Object} options
 * @param  {String} options.name       - the name of the deployment
 * @param  {String} options.token      - the token for the user who owns the deployment
 * @param  {String} options.username   - the username associated with this deployment
 * @param  {Deployment} options.deployment - a deployment model that contains the updates that will be applied
 * @return {Promise}
 */
var update;
module.exports.update = update = function update({ name, token, username, deployment }) {
  return new Promise(function(resolve, reject) {
      authenticate(username, token)
      .then((user) => {
        if(!user) return reject('not authenticated');
        Deployment.findOne({
          username,
          name
        }, (err, found) => {
          if(found) {
            found.id = deployment.id || found.id;
            found.name = deployment.name || found.name;
            found.port = deployment.port || found.port;
            found.subdomain = deployment.subdomain || found.subdomain;
            found.directory = deployment.directory || found.directory;
            found.save((err) => {
              if(err) return reject(err);
              resolve(found);
            });
          } else {
            const deployment = {
              name,
              subdomain: `${name}-${hash(6)}`,
              username
            };
            Deployment.create(deployment, (err, deployment) => {
              if(err) return reject(err);
              return resolve(deployment);
            });
          }
        });
      })
      .catch((error) => reject(error));
  });
};

/**
 * deletes the specified deployment from the user
 * @method del
 * @param  {String} name     - the name of the deployment
 * @param  {String} options.token      - the token for the user who owns the deployment
 * @param  {String} options.username   - the username associated with this deployment
 * @return {Promise}
 */
module.exports.del = function del({ name, username, token }) {
  return new Promise(function(resolve, reject) {
    authenticate(username, token)
      .then((user) => {
        Deployment.findOne({
           name,
           username: user.username
        }, (err, deployment) => {
          if(err || !deployment) return reject('error deleting deployment');

          rm(deployment.directory);

          // TODO: clean this up
          remove({
            name: deployment.subdomain,
            token,
            username
          })
            .then(() => {
              deployment.remove((error) => {
                if(error) reject(error);
                return deleteRequests({
                  subdomain: deployment.subdomain
                })
                .then(() => resolve());
              });
            });
        });
      })
      .catch((error) => reject(error));
  });
};

/**
 * express middleware to proxy to correct container
 * @method proxy
 * @param  {String} subdomain - the subdomain for the application being requested
 * @return {Promise}
 */
module.exports.proxy = function proxy(req, res) {
  const { url, method, headers } = req;
  const { host } = headers;

  // If this is not an upload request, it is a proxy request
  const subdomain = host.split('.')[0];

  Deployment.findOne({
     "subdomain":{
        "$eq": subdomain
     }
  }, (err, deployment) => {
    if(err || !deployment) {
      return res.status(404).end(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style media="screen">
              html, body {
                height: 100%;
                width: 100%;
                overflow: hidden;
              }
              .message {
                text-align: center;
                top: 50%;
                width: 100%;
                position: absolute;
              }
              h3 {
                display: inline-block;
                border-right: 1px solid #a2a2a2;
                padding-right: 10px;
              }
            </style>
            <title>Error</title>
          </head>
          <body>
            <div class="message">
              <h3>404</h3> <span> Sorry this page could not be found 🙈 </span>
            </div>
          </body>
        </html>
      `);
    }
    const { port } = deployment;
    const proxy = http.request({
      method,
      path: url,
      headers,
      port,
      host: 'localhost'
    });
    proxy.addListener('response', function (proxy_response) {
      proxy_response.addListener('data', function(chunk) {
        res.write(chunk, 'binary');
      });
      proxy_response.addListener('end', function() {
        res.end();
      });
      res.writeHead(proxy_response.statusCode, proxy_response.headers);
    });
    proxy.on('error', function() {
      res.status(502).end(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style media="screen">
              html, body {
                height: 100%;
                width: 100%;
                overflow: hidden;
              }
              .message {
                text-align: center;
                top: 50%;
                width: 100%;
                position: absolute;
              }
              h3 {
                display: inline-block;
                border-right: 1px solid #a2a2a2;
                padding-right: 10px;
              }
            </style>
            <title>Error</title>
          </head>
          <body>
            <div class="message">
              <h3>502</h3> <span> Sorry this page could not be loaded 🙈 </span>
            </div>
          </body>
        </html>
      `);
    });
    req.addListener('data', (chunk) => {
      proxy.write(chunk, 'binary');
    });
    req.addListener('end', () => {
      proxy.end();
    });
  });
};

/**
 * decorates a deployment with the correct data on get
 * @method decorate
 * @param  {Deployment} deployment - a deployment instance
 * @return {Promise}
 */
var decorate;
module.exports.decorate = decorate = function decorate(deployment) {
  return new Promise(function(resolve, reject) {
    let ddeployment = {};

    Async.waterfall([
      function(callback) {
        count({ subdomain: deployment.subdomain })
          .then((requests) => {
            ddeployment.requests = requests;
            callback();
          })
          .catch(() => {
            ddeployment.requests = 0;
            callback();
          });
      }
    ], (error) => {
      if(error) return reject(error);
      resolve(Object.assign(deployment, ddeployment));
    });
  });
};

/**
 * gets a specific deployment for the specified user
 * @method get
 * @param  {Object}  options
 * @param  {String} options.name     - the name of the deployment
 * @param  {String} options.token      - the token for the user who owns the deployment
 * @param  {String} options.username   - the username associated with this deployment
 * @param  {Boolean} option.create - create a deployment if not found
 * @return {Promise}
 */
module.exports.get = function get({ name, token, username, create }) {
  // TODO: query the container to get the status
  return new Promise(function(resolve, reject) {
    authenticate(username, token)
    .then((user) => {
      if(!user) return reject('not authenticated');

      Deployment.findOne({
        username,
        name
      }, (err, deployment) => {
        if(deployment) {
          return decorate(deployment._doc)
            .then((ddeployment) => resolve(ddeployment))
            .catch((error) => reject(error));
        }
        if(create) {
          // add a new deployment name
          // TODO: figure out how to avoid collisions
          const deployment = {
            name,
            subdomain: `${name}-${hash(6)}`,
            username
          };
          Deployment.create(deployment, (err) => {
            if(err) return reject('issue updating deployment');
            resolve(deployment);
          });
        }
      });
    })
    .catch((ex) => reject(ex));
  });
};

/**
 * gets all deployments for the specified user
 * @method getAll
 * @param  {String} options.token      - the token for the user who owns the deployment
 * @param  {String} options.username   - the username associated with this deployment
 * @return {Promise}
 */
module.exports.getAll = function getAll({ token, username }) {
  return new Promise(function(resolve, reject) {
    authenticate(username, token)
    .then((user) => {
      if(!user) return reject('not authenticated');

      Deployment.find({
        username
      }, (err, _deployments) => {
        if(err) return reject(err);

        let deployments = [];

        Async.eachOf(_deployments, (deployment, index, callback) => {
          return decorate(deployment._doc)
            .then((ddeployment) => {
              deployments.push(ddeployment);
              callback();
            })
            .catch((error) => callback(error));
        }, (err) => {
          if(err) return reject(err);
          resolve(deployments);
        });
      });
    })
    .catch((ex) => reject(ex));
  });
};

module.exports.build = function build({ name, subdomain, username, token, port, directory }) {
  return new Promise(function(resolve, reject) {
    docker.buildImage({
      context: directory,
      src: fs.readdirSync(directory)
    }, {
      t: subdomain
    }, (err, stream) => {
      if(err) return reject(err);
      docker.modem.followProgress(stream, onFinished, onProgress);

      function onFinished(err) {
        if(err) return reject(err);
        docker.createContainer({
          Image: subdomain,
          name: subdomain,
          env: [
            'PORT=3000'
          ],
          ExposedPorts: {
            '3000/tcp': {}
          },
          PortBindings: {
            '3000/tcp': [{
              'HostPort': `${port}`
            }]
          },
          Privileged: true
        }, (err, container) => {
          if (err) return reject(err);
          container.start((err) => {
            if (err) return reject(err);
            const id = container.id;

            update({
              name,
              username,
              token,
              deployment: {
                id,
                port,
                directory
              }
            })
            .then((deployment) => resolve(deployment))
            .catch((ex) => reject(ex));
          });
        });
      }
      // TODO: be able to stream the output of this to a socket to give real time updates
      function onProgress() {
        // console.log(ev);
      }
    });
  });
};

/**
 * starts a container or all containers
 * @method start
 * @param  {String=} name - to start a specific container a name property is needed
 * @param  {String} options.token      - the token for the user who owns the deployment
 * @param  {String} options.username   - the username associated with this deployment
 * @return {Promise}
 */
module.exports.start = function start({ name, username, token }) {
  return new Promise(function(resolve, reject) {
    let opts = {};
    // TODO: check username and token to make sure the request is authenticated
    if(username && token) {
      opts.username = username;
    }

    Deployment.find(opts, (err, deployments) => {
      Async.each(deployments, (deployment, callback) => {
        if(name && deployment.name == name) {
          const container = docker.getContainer(deployment.id);
          container.start(callback);
        }

        if(!name){
          const container = docker.getContainer(deployment.id);
          container.start(callback);
        }
      }, (err) => {
        if(err) return reject(err);
        return resolve(deployments);
      });
    });
  });
};

/**
 * stops a container or all containers
 * @method stop
 * @param  {String=} name - to stop a specific container a name property is needed
 * @param  {String=} options.token      - the token for the user who owns the deployment
 * @param  {String=} options.username   - the username associated with this deployment
 * @return {Promise}
 */
module.exports.stop = function stop({ name, token, username }) {
  return new Promise(function(resolve, reject) {
    let opts = {};
    // TODO: check username and token to make sure the request is authenticated
    if(username && token) {
      opts.username = username;
    }

    Deployment.find(opts, (err, deployments) => {
      Async.each(deployments, (deployment, callback) => {
        if(name && deployment.name == name) {
          const container = docker.getContainer(deployment.id);
          container.stop({ force: true }, callback);
        }

        if(!name){
          const container = docker.getContainer(deployment.id);
          container.stop({ force: true }, callback);
        }
      }, (err) => {
        if(err) return reject(err);
        return resolve(deployments);
      });
    });
  });
};

module.exports.logs = function logs({ name, token, username }) {
  return new Promise(function(resolve, reject) {
    authenticate(username, token)
    .then((user) => {
      Deployment.findOne({
        name,
        username: user.username
      }, (err, deployment) => {
          if(err) return reject(err);

          const logs = [];
          const container = docker.getContainer(deployment.id);

          const logStream = new stream.PassThrough();
          logStream.on('data', function(chunk){
            logs.push(chunk.toString('utf8'));
          });

          container.logs({
            follow: true,
            stdout: true,
            stderr: true
          }, (err, stream) => {
            if(err) {
              return reject(err);
            }
            container.modem.demuxStream(stream, logStream, logStream);
            stream.on('end', function(){
              return resolve(logs);
            });

            setTimeout(function() {
              stream.destroy();
            }, 2000);
          });
      });
    })
    .catch(() => reject('token not valid'));
  });
};

/**
 * removes a specific container, will stop and cleanup all necessary files
 * @method remove
 * @param  {String} name - the name of the container
 * @param  {String} options.token      - the token for the user who owns the deployment
 * @param  {String} options.username   - the username associated with this deployment
 * @return {Promise}
 */
var remove;
module.exports.remove = remove = function remove({ name, token, username }) {
  return new Promise(function(resolve, reject) {
    authenticate(username, token)
    .then((user) => {
      Deployment.findOne({
        subdomain: name,
        username: user.username
      }, (err, deployment) => {
        if(err) return reject(err);

        const container = docker.getContainer(deployment.id);

        Async.waterfall([
          function(callback) {
            container.stop(() => callback());
          },
          function(callback) {
            container.inspect((err, info) => {
              if(err) return callback();

              docker.getImage(info.Image).remove({
                force: true
              }, () => callback());
            });
          },
          function(callback) {
            container.remove(() => callback());
          }
        ], (err) => {
          if(err) return reject(err);
          return resolve();
        });
      });
    })
    .catch(() => reject('user does not have access to this deployment'));
  });
};
