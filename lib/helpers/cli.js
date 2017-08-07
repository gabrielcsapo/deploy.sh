/**
 * @module lib/helpers/cli
 */

module.exports = function cli(url) {
  var methods = {};

  /**
   * creates a bundle to send to the server for deployment
   * @method createBundle
   * @param  {String}     directory - the directory that is to be turned into a tar
   * @return {Promise}
   */
  methods.createBundle = function createBundle(directory) {
    const tar = require('tar');
    const fs = require('fs');

    return tar.c({
      gzip: true,
      portable: true,
      file: 'bundle.tgz'
    }, fs.readdirSync(directory));
  };

  methods.removeBundle = function removeBundle(directory) {
    const fs = require('fs');
    const path = require('path');

    return new Promise(function(resolve, reject) {
      try {
        fs.unlink(path.resolve(directory, 'bundle.tgz'), () => {
          return resolve();
        });
      } catch(ex) {
        return reject(ex);
      }
    });
  };

  /**
   * Deals with uploading a specified bundle
   * @method uploadBundle
   * @param  {Object} options
   * @param  {String} options.name - the name of the specified application
   * @param  {Stream} options.bundle - a file stream of the tar
   * @return {Promise}
   */
  methods.uploadBundle = function uploadBundle({ name, bundle, token, username }) {
    const request = require('request');

    return new Promise(function(resolve, reject) {
      request.post({
        url: `${url}/upload`,
        headers: {
          'x-distribute-token': token,
          'x-distribute-username': username
        },
        formData: {
          name,
          bundle
        }
      }, function optionalCallback(err, httpResponse, body) {
        if (err) return reject(err);
        const response = JSON.parse(body);
        if(response.error) return reject(response.error);
        return resolve(response);
      });
    });
  };

  /**
   * calls the login api to get a token to persist for future requests
   * @method login
   * @param  {Object} options
   * @param  {String} options.username - username of the account
   * @param  {String} options.password - password associated with the account
   * @return {Promise}
   */
  methods.login = function login({ username, password }) {
    const request = require('request');

    return new Promise(function(resolve, reject) {
      request.post({
        url: `${url}/login`,
        form: {
          username,
          password
        }
      }, function optionalCallback(err, httpResponse, body) {
       if(err || httpResponse.statusCode !== 200) return reject('error trying to login');
       const response = JSON.parse(body);
       if(response.error) return reject(response.error);
       return resolve(response);
      });
    });
  };

  /**
   * prompts the user to register account
   * @method register
   * @param  {Object} options
   * @param  {String} options.username - username of the account
   * @param  {String} options.password - password associated with the account
   * @return {Promise}
   */
  methods.register = function register({ username, password }) {
    const request = require('request');

    return new Promise(function(resolve, reject) {
        request.post({
          url: `${url}/register`,
          form: {
            username,
            password
          }
        }, function optionalCallback(err, httpResponse, body) {
         if(err || httpResponse.statusCode !== 200) return reject('error trying to register email');
         const response = JSON.parse(body);
         if(response.error) return reject(response.error);
         return resolve(response);
        });
    });
  };

  /**
   * calls the logout api to invalidate token
   * @method logout
   * @param {Object} options
   * @param {String} options.token - token to make authenticated calls
   * @param {String} options.username - username linked to the token
   * @return {Promise}
   */
  methods.logout = function login({ token, username }) {
    const request = require('request');

    return new Promise(function(resolve, reject) {
      request.get({
        url: `${url}/api/logout`,
        headers: {
          'x-distribute-token': token,
          'x-distribute-username': username
        }
      }, function optionalCallback(err, httpResponse, body) {
        if (err) return reject(err);
        const response = JSON.parse(body);
        if(response.error) return reject(response.error);
        return resolve(response);
      });
    });
  };

  /**
   * calls the list api to get all deployed applications
   * @method list
   * @param {Object} options
   * @param {String} options.token - token to make authenticated calls
   * @param {String} options.username - username linked to the token
   * @return {Promise}
   */
  methods.list = function list({ token, username }) {
    const request = require('request');

    return new Promise(function(resolve, reject) {
      request.get({
        url: `${url}/api/list`,
        headers: {
          'x-distribute-token': token,
          'x-distribute-username': username
        }
      }, function optionalCallback(err, httpResponse, body) {
        if (err) return reject(err);
        const response = JSON.parse(body);
        if(response.error) return reject(response.error);
        return resolve(response);
      });
    });
  };

  /**
   * persists the token and username locally
   * @method saveCredentials
   * @param {Object} options
   * @param {String} options.token - token to make authenticated calls
   * @param {String} options.username - username linked to the token
   * @return {Promise}
   */
  methods.saveCredentials = function saveCredentials({ username, token }) {
    const os = require('os');
    const fs = require('fs');
    const path = require('path');

    return new Promise((resolve, reject) => {
      const credentials = {
        username,
        token
      };
      const configPath = path.resolve(os.homedir(), 'distribute.json');
      try {
        fs.writeFileSync(configPath, JSON.stringify(credentials, null, 4));
      } catch(ex) {
        reject(ex);
      }
      return resolve({
        username,
        token
      });
    });
  };

  /**
   * gets the token and username that were persisted locally
   * @method getCredentials
   * @return {Promise}
   */
  methods.getCredentials = function getCredentials() {
    const os = require('os');
    const fs = require('fs');
    const path = require('path');

    return new Promise((resolve, reject) => {
      const configPath = path.resolve(os.homedir(), 'distribute.json');
      try {
        const credentials = JSON.parse(fs.readFileSync(configPath));
        const { username, token } = credentials;
        if(username && token) {
          return resolve({
            username,
            token
          });
        } else {
          reject('credentials not found');
        }
      } catch(ex) {
        reject(ex);
      }
    });
  };

  return methods;
};
