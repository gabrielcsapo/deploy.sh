#!/usr/bin/env node

module.exports = async function(cli, spinner) {
  spinner.text = `Deleting deployment ${cli.application}`;

  const { token, username } = await cli.getCredentials();

  await cli.deleteDeployment({ token, username, name: cli.application });

  spinner.succeed(`Deployment deleted, ${cli.application} successfully`);
};
