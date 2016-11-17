var assert = require('chai').assert;

var path = require('path');
var fs = require('fs');

describe('user', function() {

  it('should return an already existing user', function() {
      var existingUser = {
          "username": "root",
          "password": "2f50f4c17d12c11e9216264725a51bf44f5d34e6"
      };

      fs.writeFileSync(path.resolve(__dirname, '../../config/user.json'), JSON.stringify(existingUser));

      var user = require('../../operations/lib/user');
      var newUser = user.get();
      assert.isString(newUser.username);
      assert.isString(newUser.password);
      assert.equal(newUser.username, existingUser.username);
      assert.equal(newUser.password, existingUser.password);
  });

  it('should return a new user object', function() {
      // delete the cache for the user object
      delete require.cache[require.resolve('../../operations/lib/user')];
      fs.unlinkSync(path.resolve(__dirname, '../../config/user.json'));

      var user = require('../../operations/lib/user');

      var newUser = user.get();
      assert.isString(newUser.username);
      assert.isString(newUser.password);
  });

});
