const Async = require('async');
const ora = require('ora');
const table = require('text-table');

const { list, getCredentials, saveCredentials, login } = require('../lib/helpers/cli');

const spinner = ora(`Starting deploy process`).start();

Async.waterfall([
  function(callback) {
    spinner.text = 'Getting deploy keys';
    spinner.stop();

    getCredentials()
      .then((credentials) => callback(null, credentials))
      .catch(() => {
        login()
          .then((credentials) => {
            saveCredentials(credentials)
              .then(() => {
                callback(null, credentials);
              });
          })
          .catch((ex) => callback(ex));
      });
  },
  function(credentials, callback) {
    spinner.start();
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

  spinner.stopAndPersist(`List of Deployments`);
  const { deployments } = result;

  console.log( // eslint-disable-line
    table(
      Object.keys(deployments).map((r) => [deployments[r], ''])
    )
  );
});
