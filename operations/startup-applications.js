/**
 * Loops through the config.json and starts each application
 * @module startup-applications
 */

var startApplication = require('./startup-application');
var async = require('async');
var Log = require('./lib/log');

var repos = require('./lib/repos').get();

module.exports = function(callback) {
    async.eachOfLimit(repos, 1, function(repo, key, callback) {
        startApplication(repo, function(error) {
            if(error) {
              Log.application(repo.name, 'application:errored', 'ERROR');
              return callback(error);
            }
            Log.application(repo.name, 'application:started');
            // Timeout needs to be added to make sure pm2 is available again
            // Without this any app started after the first one will fail
            setTimeout(function() {
                callback();
            }, 1000);
        });
    }, function (err) {
        if(err) {
            Log.error('application:errored', err);
        } else {
            Log.info('all-applications:started');
        }
        callback();
    });
};
