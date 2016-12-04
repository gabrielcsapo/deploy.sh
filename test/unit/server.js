var assert = require('chai').assert;

var Server = require('../../operations/lib/server');

describe('server', function() {

    it('should return a default server object', function() {
      var server = Server.defaults();
      assert.deepEqual(server, {
          git: {
              port: 7000
          },
          proxy: {
              port: 1337
          }
      });
    });

    it('should return a server object', function() {
        var server = Server.get();
        assert.isObject(server);
        assert.isObject(server.git);
        assert.isNumber(server.git.port);
        assert.isObject(server);
        assert.isObject(server.proxy);
        assert.isNumber(server.proxy.port);
    });

});
