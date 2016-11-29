var path = require('path');
var fs = require('fs');
var crypto = require('crypto');

/**
 * Abstracts the responsiblity of working with the config.json file
 * @class Config
 * @type {Object}
 */
var Config = function() {

    /**
     * Gets the required value from the config.json
     * @memberof Config
     * @function get
     * @param  {string} name the key for the value wanted in the config.json
     * @return {object}      this is the entry that corresponds to the key passed in
     */
    var get = function(name) {
        delete require.cache[require.resolve('../../config/config.json')];
        var config = require('../../config/config.json');
        if(name) {
            return config[name];
        } else {
            return config;
        }
    };

    /**
     * Updates the config.json file
     * @memberof Config
     * @function update
     * @param  {object}   data     object that contains the new structure of config.json
     * @param  {function} callback function(error)
     * @param  {string=}   name    the key of the substructure that is to be updated
     */
    var update = function(data, callback, name) {
        delete require.cache[require.resolve('../../config/config.json')];
        var config = require('../../config/config.json');
        if(name) {
            config[name] = data;
        } else {
            config = data;
        }
        fs.writeFile(path.resolve(__dirname, '..', '..', 'config', 'config.json'), JSON.stringify(config, null, 4), function(err) {
            callback(err || undefined);
        });
    };

    /**
     * Generates the config.json file, if it already exists regenerates the user object
     * @memberof Config
     * @function generate
     * @return {object} returns the current state of config.json
     */
    var generate = function() {
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
            };
        }
        fs.writeFileSync(path.resolve(__dirname, '..', '..', 'config', 'config.json'), JSON.stringify(config, null, 4));
        return config;
    };

    if(!fs.existsSync(path.resolve(__dirname, '..', '..', 'config', 'config.json'))) {
        generate();
    }

    return {
        get: get,
        update: update,
        generate: generate
    };
};

module.exports = Config();
