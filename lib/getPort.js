const net = require('net');
let range = 45032;

/**
 * @function portRange
 * @params {number} range - the starting number range to find ports based on
 * @params {function} callback - function to call after port has been found
 * @returns {number} - returns a port value that is not busy
 */
const getPort = (callback) => {
    const port = range++;

    const server = net.createServer();
    server.listen(port, () => {
        server.once('close', () => {
            callback(port);
        });
        server.close();
    });
    server.on('error', () => {
        getPort(callback);
    });
};

module.exports = () => {
    return new Promise((resolve, reject) => {
        try {
            getPort((port) => {
                resolve(port);
            });
        } catch(ex) {
            reject(ex);
        }
    });
};
