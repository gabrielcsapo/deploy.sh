const Async = require('async');
const ora = require('ora');

const { logout, getCredentials, saveCredentials } = require('../lib/helpers/cli');

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

    logout({
      url: 'http://localhost:5000',
      token,
      username
    })
    .then(() => callback())
    .catch((error) => callback(error, null));
  },
  function(callback) {
    saveCredentials({ username: '', token: '' })
      .then(() => callback())
      .catch((ex) => callback(ex, null));
  }
], (ex) => {
  if (ex) {
    if(ex.error === 'no credentials found') return spinner.succeed('Already logged out');
  } else {
    return spinner.fail('Logout failed 🙈');
  }

  spinner.succeed('Logged out of session successfully');
});
