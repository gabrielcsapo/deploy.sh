const pm2 = require('pm2');
const Events = require('./events');

module.exports = (conf, cwd, port) => {
    return new Promise((resolve, reject) => {
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
    });
};
