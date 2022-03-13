import ora from 'ora';
import mongoose from 'mongoose';

import Deployment from './lib/models/deployment.js';

let running = true;

mongoose.Promise = global.Promise;

export default async function(cli, spinner) {
  try {
    spinner.text = 'Starting up deploy.sh server';

    spinner.text = 'Connecting to mongo';
    await mongoose.connect(cli.mongo, { useMongoClient: true });

    spinner.text = 'Starting existing applications';
    const deployments = await Deployment.start({});

    spinner.succeed(`Started ${deployments ? deployments.length : 0} deployment(s) successfully`);

    const { default: importServerCommand } = await import('./lib/server.js');
    return importServerCommand;
  } catch(ex) {
    if(ex.message.indexOf('HTTP code 304') > -1 || ex.message.indexOf('(HTTP code 404) no such container') > -1) {
      spinner.warn(`Services already started`);

      const { default: importServerCommand } = await import('./lib/server.js');
      return importServerCommand;
    }
    throw new Error(ex);
  }
};

async function shutdown() {
  if(!running) return;
  running = false;

  const spinner = ora('Shutting down up deploy.sh server').start();

  try {
    spinner.text = 'Stopping deployments';
    const deployments = await Deployment.stop({});

    spinner.succeed(`Shutdown ${deployments ? deployments.length : 0} deployment(s) successfully`);

    process.exit(0);
  } catch(ex) {
    spinner.fail(`
      Error on shutdown:
      ${ex}
    `);
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
