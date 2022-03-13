#!/usr/bin/env node

process.on("unhandledRejection", (err) => {
  console.log(
    `Something extremely bad happened, please let us know about this \n ${err.stack}`
  ); // eslint-disable-line
});

import ora from "ora";
import woof from "woof";
import { readFileSync } from "fs";
import updateNotifier from "update-notifier";

import CLI from "../lib/helpers/cli.js";

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url))
);

let program = woof(
  `
  Usage: deploy [options] [command]

  Commands:

    deploy|d                    Deploy the current directory
    list|ls                     List depoyments
    register|r                  Register a user account
    whoami|who|me               Shows the current logged in user's details
    login                       Login to access deploy and deployment functionality
    logout                      Logout and invalidate token
    open                        Open the deployment instance in the browser
    logs|l                      Shows the logs for the specificed project
    delete|rm                   Deletes the deployment instance
    server                      Starts a server instance locally

  Options:

    -V, --version               Output the version number
    -h, --help                  Output usage information
    -app, --application <name>  Selects the application for any of the given operations
    -u, --url <url>             Changes the URL of the serve instance of deploy.sh (defaults to http://localhost:5000)
    -m, --mongo <url>           Changes the hosted instance of mongo (defaults to mongodb://localhost/deploy-sh)
`,
  {
    importMeta: import.meta,
    version: pkg.version,
    commands: {
      deploy: {
        alias: "d",
      },
      list: {
        alias: "ls",
      },
      register: {
        alias: "r",
      },
      whoami: {
        alias: ["who", "me"],
      },
      login: {},
      logout: {},
      open: {
        alias: "o",
      },
      logs: {
        alias: "l",
      },
      delete: {
        alias: "rm",
      },
      server: {
        alias: ["serve", "s"],
      },
    },
    flags: {
      url: {
        type: "string",
        alias: "u",
        default: "http://localhost:5000",
      },
      // By default it will open the current working directories deployment
      application: {
        type: "string",
        alias: "app",
        default: process
          .cwd()
          .substring(process.cwd().lastIndexOf("/") + 1, process.cwd().length),
      },
      mongo: {
        type: "string",
        default: "mongodb://localhost/deploy-sh",
      },
    },
  }
);

(async function () {
  const cli = new CLI(program);

  let found = false;
  let commands = [
    "deploy",
    "list",
    "register",
    "whoami",
    "login",
    "logout",
    "open",
    "logs",
    "delete",
    "server",
  ];

  for (var i = 0; i < commands.length; i++) {
    let command = commands[i];
    if (program[command]) {
      try {
        found = true;

        const { default: commandImported } = await import(
          `./deploy-${command}.js`
        );
        commandImported(cli);
      } catch (ex) {
        if (ex === "credentials not found")
          return console.log("Please login for this action"); // eslint-disable-line
        console.log(
          `something happened when running ${command} \n ${ex.stack}`
        ); // eslint-disable-line
      }
    }
  }

  // The user simply typed `deploy` let's deploy their application
  // Should only be triggered if help or version flags weren't passed
  if (!found && !program["help"] && !program["version"]) {
    try {
      found = true;
      const { default: commandImported } = await import(`./deploy-deploy.js`);
      commandImported(cli);
    } catch (ex) {
      console.log(`something happened when running deploy \n ${ex.stack}`); // eslint-disable-line
    }
  }

  updateNotifier({ pkg }).notify();
})();
