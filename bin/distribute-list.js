#!/usr/bin/env node

const Async = require('async');
const ora = require('ora');
const moment = require('moment');
const Url = require('url');
const Table = require('easy-table');

const program = require('commander');
program
    .option('-u, --url [url]', 'The endpoint of the distribute.sh server', 'http://localhost:5000')
    .parse(process.argv);

const { list, getCredentials } = require('../lib/helpers/cli')(program.url);

const spinner = ora(`Getting deployment list`).start();

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
      token,
      username
    })
    .then((response) => callback(null, response))
    .catch((error) => callback(error, null));
  }
], (ex, result) => {
  if (ex) return spinner.fail(`API call failed 🙈 ${JSON.stringify({
    ex
  }, null, 4)}`);

  spinner.stop();

  const { deployments } = result;

  if(deployments) {
    var table = new Table();

    deployments.forEach((r) => {
      const config = Url.parse(program.url);
      config.host = `${r.id}.${config.host}`;
      const url = Url.format(config);

      table.cell('project', r.project);
      table.cell('url', url);
      table.cell('age', moment(r.updated_at).fromNow());
      table.newRow();
    });
    table.sort('age|asc');

    console.log(table.toString()); // eslint-disable-line
  } else {
    console.log('0 deployments found'); // eslint-disable-line
  }
});
