const async = require('async');
const path = require('path');

const getApplications = require('./getApplications');
const startApplication = require('./startApplication');
const getPort = require('./getPort');

module.exports = (directory) => {
    return getApplications(directory)
        .then((applications) => {
            return async.each(applications, (config, callback) => {
                getPort()
                    .then((port) => {
                        const cwd = path.resolve(directory, 'apps', config.name);
                        return startApplication(config, cwd, port);
                    })
                    .then(() => {
                        callback();
                    })
                    .catch((ex) => {
                        callback(ex);
                    });
            });
        });
};
