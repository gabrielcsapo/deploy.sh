const path = require('path');

const startup = require('./lib/startup');
const gitServer = require('./lib/gitServer');
const proxyServer = require('./lib/proxyServer');

const directory = path.resolve(__dirname, 'tmp');
const port = process.env.PORT || 8080;

startup(directory)
    .catch((ex) => {
        console.error(ex); // eslint-disable-line
    })
    .then(() => {
        return gitServer(directory);
    })
    .then(() => {
        return proxyServer(port);
    })
    .catch((ex) => {
        console.error(ex); // eslint-disable-line
    });
