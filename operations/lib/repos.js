// TODO: use node-flat-db, because eventually we want to be able to write to these files
// TODO: or abstract this out to be able to save the json files whenever you change the underlying object?
// TODO: add checks to make sure the data is not malformed
var path = require('path');
var fs = require('fs');
var user = require('./user');
var _ = require('underscore');

var repos;
if (!fs.existsSync(path.resolve(__dirname, '..', '..', 'config', 'repos.json'))) {
    repos = [{
        subdomain: 'test',
        name: 'test',
        anonRead: false,
        users: [{
            user: user.get(),
            permissions: ['R', 'W']
        }]
    }];
    fs.writeFileSync(path.resolve(__dirname, '..', '..', 'config', 'repos.json'), JSON.stringify(repos, null, 4));
} else {
    repos = require('../../config/repos.json');
}

module.exports = {
    /**
     * update
     * Updates the configuration file for the repo
     * @param  {object}   config   the configuration object
     * @param  {Function} callback function(err) where err is the error from writeFile
     */
    update: function(config, callback) {
        fs.writeFile(path.resolve(__dirname, '..', '..', 'config', 'repos.json'), JSON.stringify(config), function(err) {
            if (err) {
                callback(err);
            } else {
                callback(undefined)
            }
        });
    },
    get: function(name) {
        if (name) {
            var found = {};
            repos = require('../../config/repos.json');
            repos.forEach(function(repo) {
                if (repo.name == name) {
                    found = repo;
                    if (!found.user) {
                        found.user = user.get();
                    }
                }
            });
            return _.omit(found, 'git_events', 'event');
        } else {
            return repos.map(function(repo) {
                if (!repo.user) {
                    repo.user = user.get();
                }
                return _.omit(repo, 'git_events', 'event');
            });
        }
    }
};
