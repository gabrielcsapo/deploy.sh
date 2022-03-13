import tar from "tar";
import os from "os";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import FormData from "form-data";

import { request } from "./util.js";

const unlink = promisify(fs.unlink);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

class CLI {
  /**
   * the cli instance that holds all options and methods to talk to the deploy.sh service
   * @class CLI
   * @param {Object} options - contains defaults and overrides
   * @param {String} options.url - the url of the remote deploy.sh service
   * @param {String} options.application - the deployed application name to alter
   * @param {String} options.mongo - the mongo connection string used by deploy.sh service when running `deploy serve --mongo ''`
   */
  constructor(options) {
    this.url = options.url;
    this.application = options.application;
    this.mongo = options.mongo;
  }
  /**
   * creates a bundle to send to the server for deployment
   * @memberof CLI
   * @method createBundle
   * @param  {String}     directory - the directory that is to be turned into a tar
   * @return {Promise}
   */
  createBundle(directory) {
    return tar.c(
      {
        gzip: true,
        portable: true,
        file: "bundle.tgz",
      },
      fs.readdirSync(directory)
    );
  }
  /**
   * removes the bundle from the given directory
   * @memberof CLI
   * @method removeBundle
   * @param  {String} directory - path to directory
   * @return {Promise}
   */
  async removeBundle(directory) {
    return await unlink(path.resolve(directory, "bundle.tgz"));
  }
  /**
   * Deals with uploading a specified bundle
   * @memberof CLI
   * @method uploadBundle
   * @param  {Object} options
   * @param  {String} options.name - the name of the specified application
   * @param  {Stream} options.bundle - a file stream of the tar
   * @return {Promise}
   */
  async uploadBundle({ name, bundle, token, username }) {
    const form = new FormData();

    form.append("name", name);
    form.append("bundle", bundle);

    return await request("post", {
      url: `${this.url}/upload`,
      headers: {
        "x-deploy-token": token,
        "x-deploy-username": username,
        ...form.getHeaders(),
      },
      data: form.getBuffer(),
    });
  }
  /**
   * calls the login api to get a token to persist for future requests
   * @method login
   * @memberof CLI
   * @param  {Object} options
   * @param  {String} options.username - username of the account
   * @param  {String} options.password - password associated with the account
   * @return {Promise}
   */
  async login({ username, password }) {
    return await request("post", {
      url: `${this.url}/login`,
      data: {
        username,
        password,
      },
    });
  }
  /**
   * prompts the user to register account
   * @method register
   * @memberof CLI
   * @param  {Object} options
   * @param  {String} options.username - username of the account
   * @param  {String} options.password - password associated with the account
   * @return {Promise}
   */
  async register({ username, password }) {
    return await request("post", {
      url: `${this.url}/register`,
      data: {
        username,
        password,
      },
    });
  }
  /**
   * calls the logout api to invalidate token
   * @memberof CLI
   * @method logout
   * @param {Object} options
   * @param {String} options.token - token to make authenticated calls
   * @param {String} options.username - username linked to the token
   * @return {Promise}
   */
  async logout({ token, username }) {
    return await request("get", {
      url: `${this.url}/api/logout`,
      headers: {
        "x-deploy-token": token,
        "x-deploy-username": username,
      },
    });
  }
  /**
   * gets the application logs
   * @memberof CLI
   * @method getLogs
   * @param {Object} options
   * @param {String} options.token - token to make authenticated calls
   * @param {String} options.username - username linked to the token
   * @param {String} options.name - name of the deployment
   * @return {Promise}
   */
  async getLogs({ token, username, name }) {
    return await request("get", {
      url: `${this.url}/api/deployments/${name}/logs`,
      headers: {
        "x-deploy-token": token,
        "x-deploy-username": username,
      },
    });
  }
  /**
   * gets the user's deployed applications
   * @memberof CLI
   * @method getDeployments
   * @param {Object} options
   * @param {String} options.token - token to make authenticated calls
   * @param {String} options.username - username linked to the token
   * @param {String=} options.name - name of the deployment
   * @return {Promise}
   */
  async getDeployments({ token, username, name }) {
    let uri = `${this.url}/api/deployments`;
    if (name) uri += `/${name}`;

    return await request("get", {
      url: uri,
      headers: {
        "x-deploy-token": token,
        "x-deploy-username": username,
      },
    });
  }
  /**
   * deletes the specified deployment
   * @memberof CLI
   * @method deleteDeployment
   * @param {Object} options
   * @param {String} options.token - token to make authenticated calls
   * @param {String} options.username - username linked to the token
   * @param {String} options.name - name of the deployment
   * @return {Promise}
   */
  async deleteDeployment({ name, token, username }) {
    return await request("delete", {
      url: `${this.url}/api/deployments/${name}`,
      headers: {
        "x-deploy-token": token,
        "x-deploy-username": username,
      },
    });
  }
  /**
   * gets the user details
   * @memberof CLI
   * @method getUserDetails
   * @param {String} options.token - token to make authenticated calls
   * @param {String} options.username - username linked to the token
   * @return {Promise}
   */
  async getUserDetails({ token, username }) {
    return await request("get", {
      url: `${this.url}/api/user`,
      headers: {
        "x-deploy-token": token,
        "x-deploy-username": username,
      },
    });
  }
  /**
   * persists the token and username locally
   * @memberof CLI
   * @method cacheCredentials
   * @param {Object} options
   * @param {String} options.token - token to make authenticated calls
   * @param {String} options.username - username linked to the token
   * @return {Promise}
   */
  async cacheCredentials({ username, token }) {
    const credentials = {
      username,
      token,
    };
    const configPath = path.resolve(os.homedir(), ".deployrc");

    await writeFile(configPath, JSON.stringify(credentials, null, 4));

    return {
      username,
      token,
    };
  }
  /**
   * gets the token and username that were persisted locally
   * @memberof CLI
   * @method getCredentials
   * @return {Promise}
   */
  async getCredentials() {
    try {
      const configPath = path.resolve(os.homedir(), ".deployrc");
      const credentials = JSON.parse(await readFile(configPath));
      const { username, token } = credentials;
      if (username && token) {
        return {
          username,
          token,
        };
      } else {
        throw new Error("credentials not found");
      }
    } catch (ex) {
      if (ex.code === "ENOENT") {
        throw new Error("You are not logged in, please login to view identity");
      }
      throw new Error(ex);
    }
  }
}

export default CLI;
