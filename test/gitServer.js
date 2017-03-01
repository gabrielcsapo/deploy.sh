const test = require('tape');
const exec = require('child_process').exec;

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
    process.env.PORT = 9090;
    gitServer('./tmp/noop')
      .then((server) => {
        exec(`git clone http://localhost:${9090}/test.git foo`, (error, stdout, stderr) => {
          server.close();
          if (error) {
            return t.end();
          }
          return t.fail();
        });
      })
      .catch((err) => {
        t.fail();
      });
  });

  t.test('should be able to push repo to server', (t) => {
    process.env.PORT = 9091;
    gitServer('./tmp')
      .then((server) => {
        exec(`cd ./test/fixtures/test-server && git init && git add -A && git commit -m 'i' && git push http://localhost:${9091}/test-server.git master && rm -rf ./test/fixtures/test-server/.git`, (error, stdout, stderr) => {
          console.log(error);
          console.log(stdout);
        });
      })
      .catch((err) => {
        t.fail();
      });
  });

  t.end();
});
