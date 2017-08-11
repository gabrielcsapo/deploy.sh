#!/usr/bin/env node

const Async = require('async');
const ora = require('ora');

const program = require('commander');
program
    .option('-u, --url [url]', 'The endpoint of the deploy.sh server', 'http://localhost:5000')
    .parse(process.argv);

const { logout, getCredentials, cacheCredentials } = require('../lib/helpers/cli')(program.url);

const spinner = ora(`Logging out of current session`).start();

Async.waterfall([
  function(callback) {
    spinner.text = 'Getting deploy keys';

    getCredentials()
      .then((credentials) => callback(null, credentials))
      .catch((ex) => callback(ex, null));
  },
  function(credentials, callback) {
    spinner.text = 'Logging out of session';

    const { token, username } = credentials;

    logout({ token, username })
      .then(() => callback())
      .catch((error) => callback(error, null));
  },
  function(callback) {
    cacheCredentials({ username: '', token: '' })
      .then(() => callback())
      .catch((error) => callback(error, null));
  }
], (error) => {
  if (error === 'credentials not found') {
    return spinner.warn('Already logged out');
  }

  if (error) return spinner.fail(`Logout failed 🙈 ${JSON.stringify({ // eslint-disable-line
    error
  }, null, 4)}`);

  spinner.succeed('Logged out of session successfully');
});
