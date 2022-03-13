#!/usr/bin/env node

import ora from "ora";

export default async function (cli) {
  const spinner = ora().start();

  spinner.text = "Figuring out who you are";

  const { token, username } = await cli.getCredentials();
  const { user } = await cli.getUserDetails({ token, username });

  spinner.info(`currently logged in as ${user.username}`); // eslint-disable-line
}
