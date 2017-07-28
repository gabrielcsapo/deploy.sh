const test = require('tape');
const path = require('path');

const classifier = require('../../lib/classifier');

test('@lib/classifier', (t) => {
  t.plan(3);

  t.test('should be able to classify static site', (t) => {
    const directory = path.resolve(__dirname, '..', '..', 'fixtures', 'static');
    const output = classifier(directory);
    t.deepEqual(output, {
      type: 'static',
      build: `\n        FROM mhart/alpine-node:base-8\n        WORKDIR ${directory}\n        ADD . .\n\n        CMD ["node", "index.js"]\n      `
    });
    t.end();
  });

  t.test('should be able to classify node site', (t) => {
    const directory = path.resolve(__dirname, '..', '..', 'fixtures', 'node');
    const output = classifier(directory);
    t.deepEqual(output, {
      type: 'node',
      build: '\n        FROM mhart/alpine-node:8\n        WORKDIR /Users/gabrielcsapo/Documents/node-distribute/fixtures/node\n        ADD . .\n\n        RUN npm install\n\n        CMD ["npm", "start"]\n      '
    });
    t.end();
  });

  t.test('should be able to classify docker site', (t) => {
    const directory = path.resolve(__dirname, '..', '..', 'fixtures', 'docker');
    const output = classifier(directory);

    t.deepEqual(output, {
      type: 'docker',
      build: 'FROM mhart/alpine-node:8\nWORKDIR /Users/gabrielcsapo/Documents/node-distribute/fixtures/docker\nADD . .\n\nCMD ["node", "index.js"]\n'
    });
    t.end();
  });
});
