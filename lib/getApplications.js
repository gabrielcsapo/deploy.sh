const fs = require('fs');
const path = require('path');
const async = require('async');

module.exports = (directory) => {
    const configs = [];

    return new Promise((resolve, reject) => {
        fs.readdir(path.resolve(directory, 'apps'), (err, folders) => {
            async.each(folders, (f, callback) => {
                fs.readFile(path.resolve(directory, 'apps', f, 'distribute.json'), (err, config) => {
                    if(err) return callback(err);
                    configs.push(JSON.parse(config));
                    callback();
                });
            }, (err) => {
                if(err) return reject(err);
                return resolve(configs);
            });
        });
    });
};
