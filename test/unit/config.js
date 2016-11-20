var assert = require('chai').assert;

describe('config', function() {
    var Config = require('../../operations/lib/config');

    it('should return a config object', function() {
        var config = Config.get();
        assert.isObject(config.user);
        assert.isArray(config.repos);
    });

    it('should update the entire config', function(done) {
        var _config = {
            user: {
                username: 'foo',
                password: 'bar'
            },
            repos: [{
                subdomain: 'testing',
                name: 'testing-app',
                type: 'STATIC',
                anonRead: false
            }]
        };
        Config.update(_config, function(err) {
            assert.isUndefined(err);
            assert.deepEqual(Config.get(), _config);
            done();
        });
    });

});
