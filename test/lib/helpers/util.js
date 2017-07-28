const test = require('tape');

const { getPort, hash, contains } = require('../../../lib/helpers/util');

test('@lib/util', (t) => {
  t.plan(3);

  t.test('@getPort: should be able return a valid port', (t) => {
    getPort((error, port) => {
      t.ok(!error);
      t.ok(Number.isInteger(port));
      t.end();
    });
  });

  t.test('@hash: should return a proper lowercase hash', (t) => {
    const ret = hash(6);
    t.ok(ret.length, 6);
    t.ok(ret.toLowerCase(), ret);
    t.end();
  });

  t.test('@contains: should be able to return a proper conditional for truthy and false cases', (t) => {
    t.ok(contains(['index.html', 'main.css'], ['index.html', '!Dockerfile', '!package.json']));
    t.notOk(contains(['index.html', 'main.css', 'Dockerfile'], ['index.html', '!Dockerfile', '!package.json']));
    t.notOk(contains([], ['index.html', '!Dockerfile', '!package.json']));
    t.end();
  });

});
