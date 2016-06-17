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
    get: function(name) {
        if (name) {
            var found = {};
            repos = require('../../config/repos.json');
            repos.forEach(function(repo) {
                if(repo.name == name) {
                    found = repo;
                }
            });
            return _.omit(found, 'git_events', 'event');
        } else {
            return repos
        }
    }
};
