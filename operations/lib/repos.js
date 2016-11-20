var _ = require('underscore');

var config = require('./config');
var user = require('./user');

module.exports = {
    /**
     * update
     * Updates the configuration file for the repo
     * @param  {object}   config   the configuration object
     * @param  {Function} callback function(err, config) where err is the error from writeFile
     * @param  {string} name this is the name of the specific part of the config that is too be changed
     */
    update: function(data, callback, name) {
        var repos = config.get('repos');
        if(name) {
            repos.forEach(function(repo, i) {
                // update the segment that belongs to the specific repo
                if(repo.name === name) {
                    repos[i] = data;
                }
            });
            config.update(repos, function(err) {
                callback(err, data);
            }, 'repos');
        } else {
            repos = data;
            config.update(repos, function(err) {
                callback(err, repos);
            }, 'repos');
        }
    },
    get: function(name) {
        var repos = config.get('repos');
        if (name) {
            var found = {};
            repos.forEach(function(repo) {
                if (repo.name == name) {
                    found = repo;
                    if (!found.users) {
                      found.users = [{
                        user: user.get(),
                        permissions: [
                            'R',
                            'W'
                        ]
                      }];
                    }
                }
            });
            return _.omit(found, 'git_events', 'event');
        } else {
            return repos.map(function(repo) {
                if (!repo.users) {
                    repo.users = [{
                      user: user.get(),
                      permissions: [
                          'R',
                          'W'
                      ]
                    }];
                }
                return _.omit(repo, 'git_events', 'event');
            });
        }
    }
};
