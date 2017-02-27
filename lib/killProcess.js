const pm2 = require('pm2');

module.exports = (options, err) => {
    pm2.connect(function(_err) {
        if (_err) {
            console.error(_err); // eslint-disable-line
            process.exit(2);
        }

        pm2.killDaemon(() => {
            pm2.disconnect();
            if (err) console.log(err.stack); // eslint-disable-line
            process.exit();
        });
    });
};
