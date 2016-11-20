var _ = require('underscore');
var config = require('./config');

var Server = {
    get: function() {
        // returns the defaults or whatever is saved in the server config
        var response = config.get('server') || {};
        var defaults = Server.defaults();
        return _.defaults(response, defaults);
    },
    defaults: function() {
        return {
            git: {
                port: 7000
            },
            admin: {
                port: 1337
            }
        }
    }
};

module.exports = Server;
