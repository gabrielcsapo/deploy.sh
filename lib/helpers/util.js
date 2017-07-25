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
