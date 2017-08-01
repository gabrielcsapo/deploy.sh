/**
 * @module lib/helpers/util
 */
const net = require('net');

/**
 * gets an open port on the machine
 * @method getPort
 * @param  {Function} callback - the callback function to be returned when a port has been found
 */
let portrange = 45032;

/**
 * gets an open port
 * @method getPort
 * @param  {Function} callback - function(err, port) to be called when port is found
 * @return {Number} - returns a valid port
 */
module.exports.getPort = function getPort(callback) {
  var port = portrange += 1;
  var server = net.createServer();

  server.listen(port, function() {
    server.once('close', function() {
      callback(null, port);
    });
    server.close();
  });
  server.on('error', function() {
    getPort(callback);
  });
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
  for(var i in contains) {
    var key = contains[i].substring(0, 1) === '!' ? contains[i].substring(1, contains[i].length) : contains[i];
    conditions.push(contains[i].substring(0, 1) === '!' ? arr.indexOf(key) === -1 : arr.indexOf(key) > -1);
  }
  if(conditions.indexOf(false) > -1) {
    return false;
  }
  return true;
};

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
module.exports.uploadBundle = function uploadBundle({ url, name, bundle }) {
  const request = require('request');

  return new Promise(function(resolve, reject) {
    request.post({
      url,
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
