#!/usr/bin/env node

import inquirer from "inquirer";
import ora from "ora";

export default async function (cli) {
  const spinner = ora().start();

  const { username, password } = await inquirer.prompt([
    {
      name: "username",
      type: "input",
      message: "Enter a valid e-mail address:",
      validate: function (value) {
        if (
          value.length > 0 &&
          value.indexOf("@") > -1 &&
          value.indexOf(".") > -1
        ) {
          return true;
        } else {
          return "Please enter a valid e-mail address";
        }
      },
    },
    {
      name: "password",
      type: "password",
      message: "Enter a password:",
      mask: true,
      validate: function (value) {
        if (value.length) {
          return true;
        } else {
          return "Please enter a password";
        }
      },
    },
  ]);

  const credentials = await cli.register({ username, password });
  await cli.cacheCredentials(credentials);

  spinner.succeed(`registered as ${credentials.username}`); // eslint-disable-line
}
