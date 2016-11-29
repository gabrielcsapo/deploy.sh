var config = require('./config');

/**
 * The singleton user class
 * @class User
 * @type {Object}
 * @property {string} username - randomly generated username
 * @property {string} password - randomly generated password
 */
var User = function() {
    this.username = '';
    this.password = '';
};

module.exports = {
    /**
     * Gets the user
     * @memberof User
     * @function get
     * @return {User} the user specified in config.json
     */
    get: function() {
        var _user = config.get('user');
        var user = new User();
        user.username = _user.username;
        user.password = _user.password;
        return user;
    }
};
