#!/usr/bin/env node

import ora from "ora";

export default async function (cli) {
  const spinner = ora().start();

  const { token, username } = await cli.getCredentials();

  spinner.text = `Logging out of current session for ${username}`;

  await cli.logout({ token, username });
  await cli.cacheCredentials({ username: "", token: "" });

  spinner.succeed(`Logged out as ${username}`);
}
