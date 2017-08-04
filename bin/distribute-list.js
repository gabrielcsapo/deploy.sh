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
    .catch((error) => callback(error, null));
  }
], (ex, result) => {
  if (ex) return spinner.fail('API call failed 🙈');

  spinner.text = `List of Deployments`;
  spinner.stopAndPersist();
  const { deployments } = result;

  if(deployments) {
    console.log( // eslint-disable-line
      table(
        deployments.map((r) => [r.project, `http://${r.id}.localhost:5000`])
      )
    );
  } else {
    console.log('\n  0 deployments found'); // eslint-disable-line
  }
});
