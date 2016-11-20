var path = require('path');
var fs = require('fs');
var crypto = require('crypto');

var Config = {
    get: function(name) {
        delete require.cache[require.resolve('../../config/config.json')];
        var config = require('../../config/config.json');
        if(name) {
            return config[name];
        } else {
            return config;
        }
    },
    update: function(data, callback, name) {
        delete require.cache[require.resolve('../../config/config.json')];
        var config = require('../../config/config.json');
        if(name) {
            config[name] = data;
        } else {
            config = data;
        }
        fs.writeFile(path.resolve(__dirname, '..', '..', 'config', 'config.json'), JSON.stringify(config, null, 4), function(err) {
            callback(err || undefined)
        });
    },
    generate: function() {
        var config;
        if(!fs.existsSync(path.resolve(__dirname, '..', '..', 'config', 'config.json'))) {
            config = {
                "user": {
                    username: 'root',
                    password: crypto.randomBytes(20).toString('hex')
                },
                "repos": []
            };
        } else {
            config = require('../../config/config.json');
            // just update the user object
            config.user = {
                username: 'root',
                password: crypto.randomBytes(20).toString('hex')
            }
        }
        fs.writeFileSync(path.resolve(__dirname, '..', '..', 'config', 'config.json'), JSON.stringify(config, null, 4));
        return config;
    }
};

if(!fs.existsSync(path.resolve(__dirname, '..', '..', 'config', 'config.json'))) {
    Config.generate();
}

module.exports = Config;
