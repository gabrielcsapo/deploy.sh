/**
 * @module lib/helpers/cli
 */

/**
 * creates a bundle to send to the server for deployment
 * @method createBundle
 * @param  {String}     directory - the directory that is to be turned into a tar
 * @return {Promise}
 */
module.exports.createBundle = function createBundle(directory) {
  const tar = require('tar');
  const fs = require('fs');

  return tar.c({
    gzip: true,
    portable: true,
    file: 'bundle.tgz'
  }, fs.readdirSync(directory));
};

/**
 * Deals with uploading a specified bundle
 * @method uploadBundle
 * @param  {Object} options
 * @param  {String} options.url - the url endpoint for the deploy server
 * @param  {String} options.name - the name of the specified application
 * @param  {Stream} options.bundle - a file stream of the tar
 * @return {Promise}
 */
module.exports.uploadBundle = function uploadBundle({ url, name, bundle, token, username }) {
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
      return resolve(JSON.parse(body));
    });
  });
};

/**
 * calls the login api to get a token to persist for future requests
 * @method login
 * @param {Object} options
 * @param  {String} options.url - the url endpoint for the deploy server
 * @return {Promise}
 */
module.exports.login = function login({ url }) {
  const inquirer = require('inquirer');
  const request = require('request');

  return new Promise(function(resolve, reject) {
    inquirer.prompt([
      {
        name: 'username',
        type: 'input',
        message: 'Enter your e-mail address:',
        validate: function( value ) {
          if (value.length > 0 && value.indexOf('@') > -1 && value.indexOf('.') > -1) {
            return true;
          } else {
            return 'Please enter your e-mail address';
          }
        }
      },
      {
        name: 'password',
        type: 'password',
        message: 'Enter your password:',
        mask: true,
        validate: function(value) {
          if (value.length) {
            return true;
          } else {
            return 'Please enter your password';
          }
        }
      }
    ]).then((credentials) => {
      const { username, password } = credentials;
      request.post({
        url: `${url}/login`,
        form: {
          username,
          password
        }
      }, function optionalCallback(err, httpResponse, body) {
       if(err || httpResponse.statusCode !== 200) return reject('error trying to login');
       return resolve(JSON.parse(body));
      });
    })
    .catch((ex) => reject(ex));
  });
};

/**
 * calls the logout api to invalidate token
 * @method logout
 * @param {Object} options
 * @param {String} options.url - the url endpoint for the deploy server
 * @param {String} options.token - token to make authenticated calls
 * @param {String} options.username - username linked to the token
 * @return {Promise}
 */
module.exports.logout = function login({ url, token, username }) {
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
      return resolve(JSON.parse(body));
    });
  });
};

/**
 * calls the list api to get all deployed applications
 * @method list
 * @param {Object} options
 * @param {String} options.url - the url endpoint for the deploy server
 * @param {String} options.token - token to make authenticated calls
 * @param {String} options.username - username linked to the token
 * @return {Promise}
 */
module.exports.list = function list({ url, token, username }) {
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
      return resolve(JSON.parse(body));
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
module.exports.saveCredentials = function saveCredentials({ username, token }) {
  const Preferences = require('preferences');
  const prefs = new Preferences('node-distribute');

  return new Promise((resolve) => {
    prefs.credentials = {
      username,
      token
    };
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
module.exports.getCredentials = function getCredentials() {
    const Preferences = require('preferences');
    const prefs = new Preferences('node-distribute');

    const { credentials } = prefs;

    return new Promise((resolve, reject) => {
      if(credentials.username && credentials.token) {
        resolve({
          username: credentials.username,
          token: credentials.token
        });
      } else {
        reject({ error: 'no credentials found' });
      }
    });
};

/**
 * prompts the user to register account
 * @method register
 * @param {Object} options
 * @param {String} options.url - the url endpoint for the deploy server
 * @return {Promise}
 */
module.exports.register = function register({ url }) {
  const inquirer = require('inquirer');
  const request = require('request');

  return new Promise(function(resolve, reject) {
    inquirer.prompt([
      {
        name: 'username',
        type: 'input',
        message: 'Enter a valid e-mail address:',
        validate: function( value ) {
          if (value.length > 0 && value.indexOf('@') > -1 && value.indexOf('.') > -1) {
            return true;
          } else {
            return 'Please enter a valid e-mail address';
          }
        }
      },
      {
        name: 'password',
        type: 'password',
        message: 'Enter a password:',
        mask: true,
        validate: function(value) {
          if (value.length) {
            return true;
          } else {
            return 'Please enter a password';
          }
        }
      }
    ]).then((credentials) => {
      const { username, password } = credentials;
      request.post({
        url: `${url}/register`,
        form: {
          username,
          password
        }
      }, function optionalCallback(err, httpResponse, body) {
       if(err || httpResponse.statusCode !== 200) return reject('error trying to register email');
       return resolve(JSON.parse(body));
      });
    })
    .catch((ex) => reject(ex));
  });
};
