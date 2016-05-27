var path = require('path');
var fs = require('fs');
var crypto = require('crypto');

module.exports = (function() {
    // TODO: abstract into lib/startup.js
    // TODO: use lowdb, because eventually we want to be able to write to these files
    // TODO: or abstract this out to be able to save the json files whenever you change the underlying object?

    if (!fs.existsSync(path.resolve(__dirname, '..', 'config', 'user.json'))) {
        var user = {
            username: 'root',
            password: crypto.randomBytes(20).toString('hex')
        }
        fs.writeFileSync(path.resolve(__dirname, '..', 'config', 'user.json'), JSON.stringify(user, null, 4));
    }
    if (!fs.existsSync(path.resolve(__dirname, '..', 'config', 'repos.json'))) {
        var repos = [{
            name: 'test',
            anonRead: false,
            users: [{
                user: user,
                permissions: ['R', 'W']
            }]
        }];
        fs.writeFileSync(path.resolve(__dirname, '..', 'config', 'repos.json'), JSON.stringify(repos, null, 4));
    }
    // TODO: change this to show any failures so that anything requiring this can check and make sure that nothing failed
    return true;
}());
