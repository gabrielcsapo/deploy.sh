const test = require('tape');

const exec = require('child_process').exec;
const http = require('http');

const gitServer = require('../lib/gitServer');

test('gitServer', (t) => {
  t.plan(4);

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

  t.test('should be able to push repo to server', (t) => {
    t.timeout = 60000;
    process.env.GIT_PORT = 9091;
    gitServer('./tmp')
      .then((server) => {
        exec(`cd ./test/fixtures/test-server && git init && git add -A && git commit -m 'i' && git push http://localhost:${9091}/test-server.git master`, (error, stdout, stderr) => {
            setTimeout(() => {
                http.get({
                    hostname: 'localhost',
                    port: 45032,
                    path: '/',
                    agent: false
                }, (res) => {
                    res.setEncoding('utf8');
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => {
                      console.log(data);
                      console.log(res);
                      server.close();
                      t.end();
                    });
                });
            }, 3000);
        });
      })
      .catch((err) => {
        t.fail();
      });
  });

  t.end();
});

test('clean tests', (t) => {
  t.plan(1);

  t.test('cleans up directories and shuts down pm2', (t) => {
    exec(`rm -rf ./tmp && rm -rf ./test/fixtures/test-server/.git && pm2 kill`, (error, stdout, stderr) => {
      t.pass();
    });
  });

  t.end();
})
