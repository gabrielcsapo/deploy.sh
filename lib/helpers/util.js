/**
 * @module lib/helpers/util
 */

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
  const net = require('net');

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
 * middleware to verify the username and token are valid, will then set the user to req.user
 * @function _authenticate
 * @param {Object} req - express request
 * @param {Object} res - express response
 * @param {Function} next - callback to go to next middleware
 */
module.exports._authenticate = function _authenticate(req, res, next) {
  const { authenticate } = require('./db');

  const { headers } = req;
  const username = headers['x-deploy-username'];
  const token = headers['x-deploy-token'];
  if(!username && !token) {
    res.status(500).send({ error: 'authentication necessary' });
  }

  authenticate({ username, token })
    .then(function (result) {
      req.user = result;
      next();
    })
    .catch(function () {
      res.status(500).send({ error: 'not authenticated' });
    });
};
