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
 * @property {User[]}  users - an array of allowed users
 */
var Repo = function(options) {
    var defaults = {
      subdomain: '',
      name: '',
      type: '',
      anonRead: false,
      options: {},
      users: [{
        user: user.get(),
        permissions: [
            'R',
            'W'
        ]
      }]
    };

    return _.defaults(options, defaults);
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
                    found = new Repo(repo);
                }
            });
            return _.omit(found, 'git_events', 'event');
        } else {
            var _repos = repos.map(function(_repo) {
                var repo = new Repo({
                  subdomain: _repo.subdomain,
                  name: _repo.name,
                  type: _repo.type,
                  anonRead: _repo.anonRead,
                  options: _repo.options,
                  users: _repo.users
                });
                return _.omit(repo, 'git_events', 'event');
            });
            _repos.push(this.default());
            return _repos;
        }
    },
    getByHostname: function(hostname) {
      var repos = config.get('repos');
      var found = {};
      repos.forEach(function(repo) {
          if (repo.subdomain == hostname) {
              found = new Repo(repo);
          }
      });
      return _.omit(found, 'git_events', 'event');
    },
    default: function() {
        return new Repo({
            "subdomain": "admin",
            "name": "admin",
            "type": "SCRIPT",
            "options": {
              "executeDirectory": "./operations",
              "script": "startup-admin.js"
            }
        });
    }
};
