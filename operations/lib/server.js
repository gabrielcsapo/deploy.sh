var _ = require('underscore');
var config = require('./config');

/**
 * Holds the defaults for the server object
 * @class Server
 * @type {object}
 * @property {object} git - git config
 * @property {number} git.port - git port
 * @property {object} proxy - proxy config
 * @property {number} proxy.port - admin port
 */
module.exports = {
    /**
     * Gets the server configs
     * @memberof Server
     * @function get
     * @return {Server} the server config
     */
    get: function() {
        // returns the defaults or whatever is saved in the server config
        var response = config.get('server') || {};
        var defaults = this.defaults();
        return _.defaults(response, defaults);
    },
    /**
     * The server defaults
     * @memberof Server
     * @function defaults
     * @return {Server} the server config
     */
    defaults: function() {
        return {
            git: {
                port: 7000
            },
            proxy: {
                port: 1337
            }
        };
    }
};
