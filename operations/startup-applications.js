var startApplication = require('./startup-application');
var path = require('path');
var log = require('./lib/log');

module.exports = function(repos) {
    repos.forEach(function(repo) {
        startApplication(repo.name, path.resolve(__dirname, '..', 'app', repo.name), repos, function() {
            log.info('app:started:', repo.name);
        });
    });
}
