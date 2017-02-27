const pm2 = require('pm2');
const Events = require('./events');

module.exports = (conf, cwd, port) => {
    return new Promise(function(resolve, reject) {
        pm2.connect(function(err) {
            if (err) return reject(err);

            pm2.start(Object.assign({
                env: {
                    PORT: port
                },
                cwd
            }, conf), function(err) {
                pm2.disconnect();
                if (err) return reject(err);
                const config = Object.assign(conf, { port });
                Events.emit('application-added', config);
                return resolve(config);
            });
        });
    });
}
