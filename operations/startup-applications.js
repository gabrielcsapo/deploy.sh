/**
 * Loops through the config.json and starts each application
 * @module startup-applications
 */

var startApplication = require('./startup-application');
var path = require('path');
var async = require('async');
var log = require('./lib/log');
var _ = require('underscore');

var repos = require('./lib/repos').get();

module.exports = function(callback) {
    async.eachOfLimit(repos, 1, function(repo, key, callback) {
        repo = _.omit(repo, 'git_events', 'last_commit', 'event');
        startApplication(repo, path.resolve(__dirname, '..', 'app', repo.name), repos, function() {
            log.info('app:started:', repo.name);
            // Timeout needs to be added to make sure pm2 is available again
            // Without this any app started after the first one will fail
            setTimeout(function() {
                callback();
            }, 1000);
        });
    }, function (err) {
        if(err) {
            log.error('app:started', err);
        } else {
            log.info('all-applications:started');
        }
        callback();
    });
};
