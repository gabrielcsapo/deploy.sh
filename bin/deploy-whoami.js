#!/usr/bin/env node

const Async = require('async');
const ora = require('ora');

const program = require('commander');
program
    .option('-u, --url [url]', 'The endpoint of the deploy.sh server', 'http://localhost:5000')
    .parse(process.argv);

const { getCredentials, getUserDetails } = require('../lib/helpers/cli')(program.url);

const spinner = ora(`Getting user details`).start();

Async.waterfall([
  function(callback) {
    spinner.text = 'Getting deploy keys';

    getCredentials()
      .then((credentials) => callback(null, credentials))
      .catch((ex) => callback(ex, null));
  },
  function(credentials, callback) {
    spinner.text = 'Calling user api';

    const { token, username } = credentials;

    getUserDetails({ token, username })
      .then((user) => callback(null, user))
      .catch((ex) => {
        callback(ex, null);
      });
  }
], (ex, result) => {
  if (ex) return spinner.fail(`API call failed 🙈 ${JSON.stringify({
    ex
  }, null, 4)}`);

  spinner.stop();
  const { user } = result;

  console.log(`currently logged in as ${user.username}`); // eslint-disable-line
});
