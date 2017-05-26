const test = require('tape');
const path = require('path');
const exec = require('child_process').exec;
const http = require('http');

const Cloud = require('../index');

let cloud = '';

test('node-distribute', (t) => {
  t.plan(2);

  t.test('should startup node-distribute', (t) => {
    t.timeout = 100000;
    process.env.GIT_PORT = 7060;

    cloud = Cloud({
      port: 5000,
      directory: path.resolve(__dirname, 'fixtures', 'node-distribute')
    })

    cloud.start(() => {
      t.end();
    });
  });

  t.test('should be able to push (node) repo to server', (t) => {
    exec(`cd ./test/fixtures/test-server && git init && git add -A && git commit -m 'i' && git push http://localhost:${7060}/test-server.git master`, (error, stdout, stderr) => {
      setTimeout(() => {
        http.get({
          headers: {
            'host': 'test.localhost'
          },
          hostname: 'localhost',
          port: 5000,
          path: '/',
          agent: false
        }, (res) => {
          res.setEncoding('utf8');
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            t.equal(res.statusCode, 200);
            t.equal(data, 'Hello World\n');
          });
          cloud.close();
          t.end();
        });
      }, 10000);
    });
  });
  
});
