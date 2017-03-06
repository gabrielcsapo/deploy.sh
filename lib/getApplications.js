const fs = require('fs');
const path = require('path');
const async = require('async');

module.exports = (directory) => {
    const configs = [];

    return new Promise((resolve, reject) => {
        fs.readdir(path.resolve(directory, 'apps'), (err, folders) => {
            async.each(folders, (f, callback) => {
                fs.readFile(path.resolve(directory, 'apps', f, 'distribute.json'), (err, raw) => {
                    if(err) return callback(err);
                    const config = JSON.parse(raw);
                    config.directory = f;
                    configs.push(config);
                    callback();
                });
            }, (err) => {
                if(err) return reject(err);
                return resolve(configs);
            });
        });
    });
};
