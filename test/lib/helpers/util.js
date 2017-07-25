const test = require('tape');

const { getPort } = require('../../../lib/helpers/util');

test('@lib/util', (t) => {
  t.plan(1);

  t.test('@getPort: should be able return a valid port', (t) => {
    getPort((error, port) => {
      t.ok(!error);
      t.ok(Number.isInteger(port));
      t.end();
    });
  });
});
