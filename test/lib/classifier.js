const test = require('tape');
const path = require('path');

const classifier = require('../../lib/classifier');

test('@lib/classifier', async (t) => {
  t.plan(4);

  const baseDirectory = path.resolve(__dirname, '..', 'fixtures');

  t.test('should be able to classify static site', async (t) => {
    const directory = path.resolve(baseDirectory, 'static');
    const output = await classifier(directory);
    t.deepEqual(output, {
      type: 'static',
      build: `\n        FROM mhart/alpine-node:base-8\n        WORKDIR ${directory}\n        ADD . .\n\n        CMD ["node", "index.js"]\n      `
    });
    t.end();
  });

  t.test('should be able to classify node site', async (t) => {
    const directory = path.resolve(baseDirectory, 'node');
    const output = await classifier(directory);
    t.deepEqual(output, {
      type: 'node',
      build: `\n        FROM mhart/alpine-node:8\n        WORKDIR ${directory}\n        ADD . .\n\n        RUN npm install\n\n        CMD ["npm", "start"]\n      `
    });
    t.end();
  });

  t.test('should be able to classify docker site', async (t) => {
    const directory = path.resolve(baseDirectory, 'docker');
    const output = await classifier(directory);

    t.deepEqual(output, {
      type: 'docker',
      build: `FROM mhart/alpine-node:8\nWORKDIR ${directory}\nADD . .\n\nCMD ["node", "index.js"]\n`
    });
    t.end();
  });

  t.test('should be able to classify unknown deploy target', async (t) => {
    const directory = path.resolve(baseDirectory, 'unknown');
    const output = await classifier(directory);

    t.deepEqual(output, {
      type: 'unknown'
    });
    t.end();
  });
});
