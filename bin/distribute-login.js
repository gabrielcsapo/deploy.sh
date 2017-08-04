const Async = require('async');

const { saveCredentials, login } = require('../lib/helpers/cli');

Async.waterfall([
  function(callback) {
    login({
      url: 'http://localhost:5000'
    })
    .then((credentials) => {
      return saveCredentials(credentials);
    })
    .then((credentials) => {
      callback(null, credentials);
    })
    .catch((ex) => callback(ex));
  }
], (ex, result) => {
  if (ex) return console.error('login failed'); // eslint-disable-line

  console.log(`successfully logged in as ${result.username}`); // eslint-disable-line
});
