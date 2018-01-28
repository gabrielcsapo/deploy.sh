#!/usr/bin/env node

module.exports = async function(cli, spinner) {
  const { token, username } = await cli.getCredentials();

  spinner.text = `Logging out of current session for ${username}`;

  await cli.logout({ token, username });
  await cli.cacheCredentials({ username: '', token: '' });

  spinner.succeed(`Logged out of session for ${username} successfully`);
};
