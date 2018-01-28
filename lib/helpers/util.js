/**
 * @module lib/helpers/util
 */
const net = require('net');
const fs = require('fs');
const { promisify } = require('util');
const _request = require('request');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rmdir);
const mkdir = promisify(fs.mkdir);

let portrange = 45032;

/**
 * gets an open port
 * @method getPort
 * @return {Promise}
 */
module.exports.getPort = function getPort() {
  return new Promise((resolve, reject) => {
    try {
      portrange += 1;
      var server = net.createServer();

      server.listen(portrange, () => {
        server.once('close', () => {
          return resolve(portrange);
        });
        server.close();
      });
      server.on('error', () => resolve(getPort()));
    } catch(ex) {
      return reject(ex);
    }
  });
};

/**
 * makes a directory recursively
 * @param  {String} directory - path to future directory
 * @return {Promise}
 */
module.exports.mk = async function mk(directory) {
  let cwd = '';
  let path = directory.split('/');
  // If the first value is blank that means we were given an absolute path and should respect that
  if(path[0] == '') {
    path[1] = `/${path[1]}`;
  }
  // remove all of the empty entries
  path = path.filter((p) => p !== '');

  for (var i = 0; i <= path.length - 1; i++) {
    cwd += `${path[i]}${i === path.length - 1 ? '' : '/'}`;
    try {
      // try to open the directory, if we can't we will create it
      await readdir(cwd);
    } catch(ex) {
      if(ex.message.indexOf('no such file or directory') > -1) {
        await mkdir(cwd);
      }
    }
  }
  return cwd;
};

/**
 * gets a lowercase random string with specified length
 * @method hash
 * @param  {Number} length - the specified length of the random string
 * @return {String}
 */
const possible = "abcdefghijklmnopqrstuvwxyz0123456789";

module.exports.hash = function hash(length) {
  let text = "";

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
};

module.exports.request = function request(type, options) {
  return new Promise(function(resolve, reject) {
    _request[type](options, (err, httpResponse, body) => {
      if(err) reject(err);
      const response = JSON.parse(body);
      if(response.error) return reject(response.error);
      return resolve(response);
    });
  });
};

/**
 * contains is a function that takes an array and see if the condition matches
 * @method contains
 * @param  {Array} arr      - array to check with rules
 * @param  {Array} contains - rules to make sure the arr contains the following
 * @return {Boolean}        - responds back with a boolean value
 * @example
 * contains(['index.html', 'main.css'], ['index.html', '!Dockerfile', '!package.json'])
 */
module.exports.contains = function contains(arr, contains) {
  var conditions = [];
  for (var i in contains) {
    var key = contains[i].substring(0, 1) === '!' ? contains[i].substring(1, contains[i].length) : contains[i];
    conditions.push(contains[i].substring(0, 1) === '!' ? arr.indexOf(key) === -1 : arr.indexOf(key) > -1);
  }
  if (conditions.indexOf(false) > -1) {
    return false;
  }
  return true;
};

module.exports.rm = async function rm(dir) {
  let files = await readdir(dir);

  if (files.length > 0) {
    for (var i = 0; i < files.length; i++) {
      var file = dir + '/' + files[i];
      if ((await stat(file)).isFile()) {
        await unlink(file);
      } else {
        await rm(file);
      }
    }
  }
  await rmdir(dir);
};
