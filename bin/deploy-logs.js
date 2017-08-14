#!/usr/bin/env node

const Async = require('async');
const ora = require('ora');

const program = require('commander');
program
    .option('-u, --url [url]', 'The endpoint of the deploy.sh server', 'http://localhost:5000')
    .parse(process.argv);

const name = program.args[0];
const { getLogs, getCredentials } = require('../lib/helpers/cli')(program.url);

const spinner = ora(`Opening up url to deployment instance`).start();

Async.waterfall([
  function(callback) {
    spinner.text = 'Getting deploy keys';

    getCredentials()
      .then((credentials) => callback(null, credentials))
      .catch((ex) => callback(ex, null));
  },
  function(credentials, callback) {
    spinner.text = 'Calling log API';

    const { token, username } = credentials;

    getLogs({ token, username, name })
      .then((response) => callback(null, response))
      .catch((error) => callback(error, null));
  }
], (ex, result) => {
  if (ex) return spinner.fail(`API call failed 🙈 ${JSON.stringify({
    ex
  }, null, 4)}`);

  spinner.stop();
  const { logs } = result;

  if(logs) {
    console.log( // eslint-disable-line
      logs.map((l) => {
        let log = l.split(' ');
        log.unshift('-');
        return log.join(' ');
      }).join('')
    );
  } else {
    console.log('no logs available 🙈'); // eslint-disable-line
  }
});
