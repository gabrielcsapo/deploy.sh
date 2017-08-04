const Async = require('async');

const { saveCredentials, register } = require('../lib/helpers/cli');

Async.waterfall([
  function(callback) {
    return register({
        url: 'http://localhost:5000'
      })
      .then((credentials) => {
        return saveCredentials(credentials);
      })
      .then((credentials) => callback(null, credentials))
      .catch((ex) => callback(ex, null));
  }
], (ex, result) => {
  if (ex) console.error('failed to register'); // eslint-disable-line

  console.log(`registered as ${result.username}`); // eslint-disable-line
});
