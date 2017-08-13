const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/deploy-sh');
mongoose.Promise = global.Promise;

process.on('unhandledRejection', (err, p) => {
  console.log('An unhandledRejection occurred'); // eslint-disable-line
  console.log(`Rejected Promise: ${p}`); // eslint-disable-line
  console.log(`Rejection: ${err}`); // eslint-disable-line
});

const { start, stop } = require('./lib/models/deployment');

console.log('starting up deployments'); // eslint-disable-line
start({})
 .then((deployments) => {
   console.log( // eslint-disable-line
     `
     started ${deployments.length} deployment(s) successfully
     `
   );
   require('./lib/server');
 })
 .catch((ex) => {
   console.log( // eslint-disable-line
     `
     error on startup:
     ${ex}
     `
   );
   require('./lib/server');
 });

function shutdown() {
  console.log('shutting down deployments'); // eslint-disable-line
  stop({})
    .then((deployments) => {
      console.log( // eslint-disable-line
        `
        shutdown ${deployments.length} deployment(s) successfully
        `
      );
      process.exit();
    })
    .catch((ex) => {

      console.log( // eslint-disable-line
        `
          error on shutdown:
          ${ex}
        `
      );
      process.exit();
    });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
