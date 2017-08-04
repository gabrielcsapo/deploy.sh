const Async = require('async');
const fs = require('fs');
const path = require('path');
const ora = require('ora');

const { createBundle, uploadBundle, getCredentials } = require('../lib/helpers/cli');

const spinner = ora(`Starting deploy process`).start();

Async.waterfall([
  function(callback) {
    spinner.text = 'Creating Application Bundle';

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
    spinner.text = 'Uploading Application Bundle';

    const { token, username } = credentials;
    const bundle = fs.createReadStream(path.resolve(process.cwd(), 'bundle.tgz'));

    uploadBundle({
      url: 'http://localhost:5000',
      name: path.basename(process.cwd()),
      bundle,
      token,
      username
    })
    .then((response) => callback(null, response))
    .catch((error) => callback(error, null));
  }
], (ex, project) => {
  if (ex) return spinner.fail('Deployment failed 🙈');

  spinner.succeed(`Upload succeed http://${project.id}.localhost:5000`);
});
