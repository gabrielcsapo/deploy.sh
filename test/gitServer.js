const test = require('tape');

const exec = require('child_process').exec;
const http = require('http');

const gitServer = require('../lib/gitServer');

let globalInstance = '';

test('gitServer', (t) => {
  t.plan(8);

  t.test('should cleanup repos', (t) => {
    exec(`rm -rf ./tmp && rm -rf ./test/fixtures/test-server/.git && rm -rf ./test/fixtures/test-static/.git && pm2 kill;`, (error, stdout, stderr) => {
      t.end();
    });
  });

  t.test('should fail to start gitServer', (t) => {
    gitServer()
      .then(() => {
        t.fail();
      })
      .catch((err) => {
        t.equal(err.toString(), 'TypeError: Path must be a string. Received undefined');
        t.end();
      });
  });

  t.test('should start gitServer', (t) => {
    gitServer('./tmp')
      .then((server) => {
        // close the server we don't need it anymore
        server.close();
        t.end();
      })
      .catch((err) => {
        t.fail();
      });
  });

  t.test('should fail to fetch repo', (t) => {
    process.env.GIT_PORT = 9090;
    gitServer('./tmp/noop')
      .then((server) => {
        exec(`git clone http://localhost:${9090}/test.git /tmp/foo`, (error, stdout, stderr) => {
          server.close();
          if (error) {
            return t.end();
          }
          return t.fail('should not have cloned correctly');
        });
      })
      .catch((err) => {
        t.fail();
      });
  });

  t.test('should startup git server', (t) => {
    t.timeout = 60000;
    process.env.GIT_PORT = 9091;
    gitServer('./tmp')
      .then((server) => {
        globalInstance = server;
        t.end();
      })
      .catch((err) => {
        t.fail();
      });
  });

  t.test('should be able to push (node) repo to server', (t) => {
    t.timeout = 60000;
    exec(`cd ./test/fixtures/test-server && git init && git add -A && git commit -m 'i' && git push http://localhost:${9091}/test-server.git master`, (error, stdout, stderr) => {
      setTimeout(() => {
        http.get({
          hostname: 'localhost',
          port: globalInstance.applications['test'].port,
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
          t.end();
        });
      }, 10000);
    });
  });

  t.test('should be able to push (static) repo to server', (t) => {
    t.timeout = 60000;
    exec(`cd ./test/fixtures/test-static && git init && git add -A && git commit -m 'i' && git push http://localhost:${9091}/test-static.git master`, (error, stdout, stderr) => {
      setTimeout(() => {
        http.get({
          hostname: 'localhost',
          port: globalInstance.applications['static'].port,
          path: '/',
          agent: false
        }, (res) => {
          res.setEncoding('utf8');
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            t.equal(res.statusCode, 200);
            t.equal(data.replace(/\n/g, '').replace(/ /g, ''), '<!DOCTYPEhtml><html><head><metacharset="utf-8"><title>Hello</title><linkrel="stylesheet"href="/assets/style.css"></head><body>HelloWORLD!</body></html>');
            t.end();
          });
        });
      }, 10000);
    });
  });

  t.test('should shutdown server', (t) => {
    globalInstance.close();
    t.end();
  });

});
