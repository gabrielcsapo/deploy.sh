#!/usr/bin/env node

const Async = require('async');
const fs = require('fs');
const path = require('path');
const ora = require('ora');

const program = require('commander');
program
    .option('-u, --url [url]', 'The endpoint of the distribute.sh server', 'http://localhost:5000')
    .parse(process.argv);

const { removeBundle, createBundle, uploadBundle, getCredentials } = require('../lib/helpers/cli')(program.url);

const spinner = ora(`Starting deploy process`).start();

Async.waterfall([
  function(callback) {
    spinner.text = 'Creating application bundle';

    createBundle(process.cwd())
      .then(() => callback(null))
      .catch((ex) => callback(ex, null));
  },
  function(callback) {
    spinner.text = 'Getting deploy keys';

    getCredentials()
      .then((credentials) => callback(null, credentials))
      .catch((ex) => callback(ex, null));
  },
  function(credentials, callback) {
    spinner.start();
    spinner.text = 'Uploading application bundle';

    const { token, username } = credentials;
    const bundle = fs.createReadStream(path.resolve(process.cwd(), 'bundle.tgz'));

    uploadBundle({
      name: path.basename(process.cwd()),
      bundle,
      token,
      username
    })
      .then((response) => callback(null, response))
      .catch((error) => callback(error, null));
  },
  function(project, callback) {
    spinner.text = 'Cleaning up local files';

    removeBundle(process.cwd())
      .then(() => callback(null, project))
      .catch((error) => callback(error, null));
  }
], (ex, project) => {
  if (ex) return spinner.fail(`Deployment failed 🙈 ${JSON.stringify({
    ex
  }, null, 4)}`);

  spinner.succeed(`Upload successfully, http://${project.id}.localhost:5000`);
});
