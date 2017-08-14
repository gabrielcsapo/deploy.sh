const Async = require('async');
const mongoose = require('mongoose');
const ora = require('ora');

const spinner = ora('Starting up deploy.sh server').start();
const { start, stop } = require('./lib/models/deployment');

let running = true;

mongoose.Promise = global.Promise;

process.on('unhandledRejection', (err, p) => {
  console.log('An unhandledRejection occurred'); // eslint-disable-line
  console.log(`Rejected Promise: ${p}`); // eslint-disable-line
  console.log(`Rejection: ${err}`); // eslint-disable-line
});

Async.waterfall([
  function(callback) {
    spinner.text = 'Connecting to mongo';

    mongoose.connect('mongodb://localhost/deploy-sh', { useMongoClient: true })
      .then(() => callback())
      .catch(err => callback(err));
  },
  function(callback) {
    spinner.text = 'Starting existing applications';
    start({})
     .then((deployments) => callback(null, deployments))
     .catch((ex) => callback(ex));
  }
], (error, deployments) => {
  if(error) {
    spinner.fail(`
      Error on startup:
      ${error}
    `);
  } else {
    spinner.succeed(`Started ${deployments.length} deployment(s) successfully`);
  }
  return require('./lib/server');
});

function shutdown() {
  if(!running) return;
  running = false;
  const spinner = ora('Shutting down up deploy.sh server').start();

  Async.waterfall([
    function(callback) {
      spinner.text = 'Stopping deployments';
      stop({})
        .then((deployments) => callback(null, deployments))
        .catch((error) => callback(error));
    }
  ], (error, deployments) => {
    if(error) {
      spinner.fail(`
        Error on shutdown:
        ${error}
      `);
    } else {
      spinner.succeed(`Shutdown ${deployments.length} deployment(s) successfully`);
    }
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
