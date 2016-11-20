var config = require('./config');

module.exports = {
    get: function() {
        return config.get('user');
    }
};
