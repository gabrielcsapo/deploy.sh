#!/usr/bin/env node

import ora from 'ora';

export default async function(cli) {
  const spinner = ora().start();

  spinner.text = `Getting logs for application: "${cli.application}"`;

  const { token, username } = await cli.getCredentials();
  const { logs } = await cli.getLogs({ token, username, name: cli.application });

  if(logs) {
    spinner.info(`
==========
${logs.join('').trim()}
==========
    `);
  } else {
    spinner.info('No logs available 🙈'); // eslint-disable-line
  }
};
