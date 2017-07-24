const test = require('tape');
const path = require('path');

const classifier = require('../../lib/classifier');

test('@lib/classifier', (t) => {
  t.plan(1);

  t.test('should be able to classify static site', (t) => {
    const directory = path.resolve(__dirname, '..', 'fixtures', 'static');
    const output = classifier(directory);
    t.deepEqual(output, { type: 'static',
  build: `\n        FROM mhart/alpine-node:base-6\n        WORKDIR ${directory}\n        ADD . .\n\n        CMD ["node", "index.js"]\n      ` });
    t.end();
  });
});
