var _ = require('underscore');

var config = require('./config');
var user = require('./user');

/**
 * A repo object
 * @class Repo
 * @type {Object}
 * @property {string} subdomain - the sudomain of this specific repo
 * @property {string} name - the name of the repo
 * @property {string} type - the type of application (NODE / STATIC)
 * @property {string} annonRead - can anyone read the remote git repo
 * @property {array}  users - an array of allowed users
 */
var Repo = function() {
    this.subdomain = '';
    this.name = '';
    this.type = '';
    this.anonRead = false;
    this.options = {};
    this.users = [];
};

module.exports = {
    /**
     * Updates the configuration file for the repo
     * @memberof Repo
     * @function update
     * @param  {object}   config   the configuration object
     * @param  {Function} callback function(err, config) where err is the error from writeFile
     * @param  {string=} name this is the name of the specific part of the config that is too be changed
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
    /**
     * Gets all or a specified repo
     * @memberof Repo
     * @function get
     * @param  {string=} name the name of the specific repo
     * @return {Repo}      an array or single object or Process object(s)
    */
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
            return repos.map(function(_repo) {
                var repo = new Repo();
                repo.subdomain = _repo.subdomain;
                repo.name = _repo.name;
                repo.type = _repo.type;
                repo.anonRead = _repo.anonRead;
                repo.options = _repo.options;
                repo.users = _repo.users;
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
