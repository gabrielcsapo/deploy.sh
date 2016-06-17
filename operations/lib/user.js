// TODO: use node-flat-db, because eventually we want to be able to write to these files
// TODO: or abstract this out to be able to save the json files whenever you change the underlying object?
// TODO: add checks to make sure the data is not malformed
var path = require('path');
var fs = require('fs');
var crypto = require('crypto');

var user;
if (!fs.existsSync(path.resolve(__dirname, '..', '..', 'config', 'user.json'))) {
    user = {
        username: 'root',
        password: crypto.randomBytes(20).toString('hex')
    }
    fs.writeFileSync(path.resolve(__dirname, '..', '..', 'config', 'user.json'), JSON.stringify(user, null, 4));
} else {
    user = require('../../config/user.json');
}

module.exports = {
    get: function() {
        return user;
    }
};
