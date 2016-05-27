var Git = require('nodegit');
var path = require('path');
var rmdir = require('rimraf');
var Promise = require('bluebird');

// TODO: make a callback or promise
module.exports = function(location, name, directory) {
    return new Promise(function(resolve, reject) {
        rmdir(directory, function(err) {
            // TODO: pass in callback
            if (err) {
                reject(err);
            }
            Git.Clone(location, directory)
                .then(function() {
                    resolve()
                })
                .catch(function(err) {
                    reject(err);
                });
        });
    });
}
