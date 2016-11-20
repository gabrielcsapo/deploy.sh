var path = require('path');
var fs = require('fs');
var crypto = require('crypto');

var config;
if(!fs.existsSync(path.resolve(__dirname, '..', '..', 'config', 'config.json'))) {
    config = {
        "user": {
            username: 'root',
            password: crypto.randomBytes(20).toString('hex')
        },
        "repos": []
    };
    fs.writeFileSync(path.resolve(__dirname, '..', '..', 'config', 'config.json'), JSON.stringify(config, null, 4));
} else {
    config = require('../../config/config.json');
}

module.exports = {
    get: function(name) {
        if(name) {
            return config[name];
        } else {
            return config;
        }
    },
    update: function(data, callback, name) {
        if(name) {
            config[name] = data;
        } else {
            config = data;
        }
        fs.writeFile(path.resolve(__dirname, '..', '..', 'config', 'config.json'), JSON.stringify(config), function(err) {
            if (err) {
                callback(err);
            } else {
                callback(undefined)
            }
        });
    }
}
