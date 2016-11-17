var assert = require('chai').assert;

describe('log', function() {
  it('should return an object', function() {
    assert.isObject(require('../../operations/lib/log'));
  });
});
