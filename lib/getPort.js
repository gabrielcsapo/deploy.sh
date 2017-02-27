const net = require('net');
let portrange = 45032;

const getPort = (cb) => {
    const port = portrange++;

    const server = net.createServer();
    server.listen(port, () => {
        server.once('close', () => {
            cb(port);
        });
        server.close();
    });
    server.on('error', () => {
        getPort(cb);
    });
};

module.exports = () => {
    return new Promise(function(resolve, reject) {
        try {
            getPort((port) => {
                resolve(port);
            });
        } catch(ex) {
            reject(ex);
        }
    });
};
