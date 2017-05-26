const path = require('path');
const pm2 = require('pm2');

const startup = require('./lib/startup');
const gitServer = require('./lib/gitServer');
const proxyServer = require('./lib/proxyServer');

module.exports = (options) => {
  const port = options.port || process.env.PORT || 8080;
  const directory = options.directory || process.env.DIRECTORY || path.resolve(__dirname, 'tmp');

  let servers = {
    'git': '',
    'proxy': ''
  };

  return {
    close: () => {
      servers['git'].server.close();
      servers['proxy'].close();

      pm2.connect((err) => {
        if (err) {
          console.error(err);
          process.exit(2);
        }
        pm2.killDaemon(() => {
          return;
        });
      });
    },
    start: (callback) => {
      return startup(directory)
          .catch((ex) => {
              callback(ex);
          })
          .then(() => {
              return gitServer(directory);
          })
          .then((git) => {
              servers['git'] = git;
              servers['proxy'] = proxyServer(port);
              callback();
          })
          .catch((ex) => {
              callback(ex);
          });
    }
  };

  process.on('exit', () => {
    console.log('closing');
  });

}
