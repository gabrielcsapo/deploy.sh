const test = require('tape');
const getPort = require('../lib/getPort');

test('getPort', (t) => {
  t.plan(1);

  t.test('should get back a valid port', (t) => {
      getPort()
        .then((port) => {
            t.equal(typeof port, 'number', 'port should be a number');
            t.end();
        });
  });

  t.end();
});
