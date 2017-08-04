#!/usr/bin/env node

const opn = require('opn');
const program = require('commander');

process.on('unhandledRejection', error => {
  // Will print "unhandledRejection err is not defined"
  console.log('unhandledRejection', error);
});

program
  .parse(process.argv);

var project = program.args[0];

const Async = require('async');
const ora = require('ora');
const table = require('text-table');

const { list, getCredentials } = require('../lib/helpers/cli');

const spinner = ora(`Starting deploy process`).start();

Async.waterfall([
  function(callback) {
    spinner.text = 'Getting deploy keys';

    getCredentials()
      .then((credentials) => callback(null, credentials))
      .catch((ex) => callback(ex, null));
  },
  function(credentials, callback) {
    spinner.text = 'Calling list API';

    const { token, username } = credentials;

    list({
      url: 'http://localhost:5000',
      token,
      username
    })
    .then((response) => callback(null, response))
    .catch((error) => {
      console.log(error);
      callback(error, null)
    });
  }
], (ex, result) => {
  if (ex) return spinner.fail('API call failed 🙈');

  const dep = result.deployments.filter((d) => d.project == project)[0]
  const url = `http://${dep.id}.localhost:5000`;

  spinner.text = `Opening deployment at ${url}`;
  spinner.stopAndPersist();
  opn(url);
});
