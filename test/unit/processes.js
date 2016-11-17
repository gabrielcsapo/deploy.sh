var assert = require('chai').assert;

describe('processes', function() {

    it('should return a Process object', function() {
      var Process = require('../../operations/lib/processes');

      var process = Process.get('test');
      assert.isString(process.name);
      assert.isArray(process.memory);
      assert.isArray(process.cpu);
      assert.isArray(process.traffic);
      assert.isArray(process.logs);
      assert.isObject(process.repo);
    });

    it('should return an array', function() {
      var Process = require('../../operations/lib/processes');

      var processes = Process.get();
      assert.isArray(processes);
    });

});
