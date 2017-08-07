#!/usr/bin/env node

const Async = require('async');
const ora = require('ora');

const program = require('commander');
program
    .option('-u, --url [url]', 'The endpoint of the distribute.sh server', 'http://localhost:5000')
    .parse(process.argv);

const { logout, getCredentials, saveCredentials } = require('../lib/helpers/cli')(process.env.URL);

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
    saveCredentials({ username: '', token: '' })
      .then(() => callback())
      .catch((ex) => callback(ex, null));
  }
], (ex) => {
  if (ex) return console.error(`Logout failed 🙈 ${JSON.stringify({ // eslint-disable-line
    ex
  }, null, 4)}`);

  spinner.succeed('Logged out of session successfully');
});
