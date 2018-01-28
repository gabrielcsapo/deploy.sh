const test = require('tape');
const os = require('os');
const fs = require('fs');

const { getPort, hash, contains, mk, rm } = require('../../../lib/helpers/util');

test('@lib/util', (t) => {
  t.plan(4);

  t.test('@getPort: should be able return a valid port', async (t) => {
    let port = await getPort();
    let port1 = await getPort();
    t.ok(Number.isInteger(port));
    t.ok(Number.isInteger(port1));
    t.ok(port !== port1);
    t.end();
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

  t.test('@mk / @rm: should be able to make recursive directory', async (t) => {
    let directory = `${os.tmpdir()}/hello/world/this/is/a/nested/directory`;

    await mk(directory);

    t.ok(fs.existsSync(directory));

    await rm(directory);

    t.ok(!fs.existsSync(directory));

    t.end();
  });

});
