#!/usr/bin/env node

module.exports = async function(cli, spinner) {
  spinner.text = `Getting logs for ${cli.application}`;

  const { token, username } = await cli.getCredentials();
  const { logs } = await cli.getLogs({ token, username, name: cli.application });

  spinner.stop();

  if(logs) {
    console.log('' + // eslint-disable-line
    `==========
      ${logs.join('').trim()}
    ==========`);
  } else {
    console.log('No logs available 🙈'); // eslint-disable-line
  }
};
