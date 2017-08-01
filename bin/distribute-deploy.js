const Async = require('async');
const fs = require('fs');
const path = require('path');
const ora = require('ora');

const { createBundle, uploadBundle } = require('../lib/helpers/util');

const spinner = ora(`Starting deploy process`).start();

Async.waterfall([
  function(callback) {
    spinner.text = 'Creating Application Bundle';

    createBundle(process.cwd())
      .then(() => callback(null))
      .catch((ex) => callback(ex, null));
  },
  function(callback) {
    spinner.text = 'Uploading Application Bundle';

    const bundle = fs.createReadStream(path.resolve(process.cwd(), 'bundle.tgz'));

    uploadBundle({
      url: 'http://localhost:5000/upload',
      name: path.basename(process.cwd()),
      bundle
    })
    .then((response) => callback(null, response))
    .catch((error) => callback(error, null));
  }
], (ex, result) => {
  if (ex) return spinner.fail('Deployment failed 🙈');

  spinner.succeed(`Upload succeed ${result.url}`);
});
