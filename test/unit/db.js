var assert = require('chai').assert;

describe('processes', function() {

    it('should return a Process object', function() {
      var DB = require('../../operations/lib/db');

      var db = DB('test', 'memory');
      assert.isObject(db);
    });

});
