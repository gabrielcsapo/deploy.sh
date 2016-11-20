var assert = require('chai').assert;

describe('user', function() {

  it('should return a new user object', function() {
      var user = require('../../operations/lib/user').get();

      assert.isString(user.username);
      assert.isString(user.password);
  });

});
