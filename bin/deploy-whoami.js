#!/usr/bin/env node

module.exports = async function(cli, spinner) {
  spinner.text = 'Figuring out who you are';

  const { token, username } = await cli.getCredentials();
  const { user } = await cli.getUserDetails({ token, username });

  spinner.stop();
  
  console.log(`currently logged in as ${user.username}`); // eslint-disable-line
};
