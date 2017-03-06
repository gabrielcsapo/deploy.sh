const pm2 = require('pm2');
const path = require('path');
const Events = require('./events');

module.exports = (conf, cwd, port) => {
    return new Promise((resolve, reject) => {
        if(conf.type == 'STATIC') {
          pm2.start(Object.assign({
              env: {
                  PORT: port,
                  DIRECTORY: cwd
              },
              exec_mode: 'cluster',
              cwd,
              script: path.resolve(__dirname, 'serveStatic.js')
          }, conf), (err) => {
              pm2.disconnect();
              if (err) return reject(err);
              const config = Object.assign(conf, {
                  port
              });
              Events.emit('application-added', config);
              return resolve(config);
          });
        } else {
          pm2.start(Object.assign({
              env: {
                  PORT: port
              },
              exec_mode: 'cluster',
              cwd
          }, conf), (err) => {
              pm2.disconnect();
              if (err) return reject(err);
              const config = Object.assign(conf, {
                  port
              });
              Events.emit('application-added', config);
              return resolve(config);
          });
        }
    });
};
