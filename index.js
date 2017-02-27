const path = require('path');

const startup = require('./lib/startup');
const startupServer = require('./lib/startupServer');
const startupProxyServer = require('./lib/startupProxyServer');

const directory = path.resolve(__dirname, 'tmp');
const port = process.env.PORT || 8080;

startup(directory)
    .catch((ex) => {
        console.error(ex); // eslint-disable-line
    })
    .then(() => {
        return startupServer(directory);
    })
    .then(() => {
        return startupProxyServer(port);
    });
