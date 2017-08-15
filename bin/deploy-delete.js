#!/usr/bin/env node

const Async = require('async');
const ora = require('ora');

const program = require('commander');
program
    .option('-u, --url [url]', 'The endpoint of the deploy.sh server', 'http://localhost:5000')
    .parse(process.argv);

const name = program.args[0];
const { deleteDeployment, getCredentials } = require('../lib/helpers/cli')(program.url);

const spinner = ora(`Deleting deployment instance`).start();

Async.waterfall([
  function(callback) {
    spinner.text = 'Getting deploy keys';

    getCredentials()
      .then((credentials) => callback(null, credentials))
      .catch((ex) => callback(ex, null));
  },
  function(credentials, callback) {
    spinner.text = 'Calling delete API';

    const { token, username } = credentials;

    deleteDeployment({ token, username, name })
      .then(() => callback())
      .catch((error) => callback(error));
  }
], (ex) => {
  if (ex) return spinner.fail(`API call failed 🙈 ${JSON.stringify({
    ex
  }, null, 4)}`);

  spinner.succeed('deployment deleted successfully');
});
