var startApplication = require('./startup-application');
var path = require('path');
var log = require('./lib/log');

var repos = require('./lib/repos').get();

module.exports = function() {
    repos.forEach(function(repo) {
        startApplication(repo.name, path.resolve(__dirname, '..', 'app', repo.name), repos, function() {
            log.info('app:started:', repo.name);
        });
    });
}
