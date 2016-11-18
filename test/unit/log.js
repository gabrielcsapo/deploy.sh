var assert = require('chai').assert;

var Log = require('../../operations/lib/log');
describe('log', function() {

  it('should return an object', function() {
    assert.isObject(Log);
  });
  it('should return a string', function() {
    var log = Log.application('test', 'hello-world');
    assert.isString(log);
    assert.equal(log.substring(0, 3), 'LOG');
    assert.equal(log.indexOf('hello-world') > -1, true);
  });
  it('should return a string starting with ERROR', function() {
    var log = Log.application('test', 'hello-world', 'ERROR');
    assert.isString(log);
    assert.equal(log.substring(0, 5), 'ERROR');
    assert.equal(log.indexOf('hello-world') > -1, true);
  });
});
