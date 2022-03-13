#!/usr/bin/env node
import ora from 'ora';

export default async function(cli) {
  const spinner = ora().start();

  spinner.text = `Deleting deployment ${cli.application}`;

  const { token, username } = await cli.getCredentials();

  await cli.deleteDeployment({ token, username, name: cli.application });

  spinner.succeed(`Deployment deleted, ${cli.application} successfully`);
};
