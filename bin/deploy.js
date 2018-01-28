#!/usr/bin/env node

process.on('unhandledRejection', (err) => {
  console.log(`Something extremely bad happened, please let us know about this \n ${err.stack}`); // eslint-disable-line
});

const ora = require('ora');
const woof = require('woof');
const updateNotifier = require('update-notifier');

const CLI = require('../lib/helpers/cli');
const pkg = require('../package.json');

let program = woof(`
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
`, {
  version: pkg.version,
  commands: {
    deploy: {
      alias: 'd'
    },
    list: {
      alias: 'ls'
    },
    register: {
      alias: 'r'
    },
    whoami: {
      alias: ['who', 'me']
    },
    login: {},
    logout: {},
    open: {
      alias: 'o'
    },
    logs: {
      alias: 'l'
    },
    delete: {
      alias: 'rm'
    },
    server: {
      alias: ['serve', 's']
    }
  },
  flags: {
    url: {
      type: 'string',
      alias: 'u',
      default: 'http://localhost:5000'
    },
    // By default it will open the current working directories deployment
    application: {
      type: 'string',
      alias: 'app',
      default: process.cwd().substring(process.cwd().lastIndexOf('/') + 1, process.cwd().length)
    },
    mongo: {
      type: 'string',
      default: 'mongodb://localhost/deploy-sh'
    }
  }
});

(async function() {
  const cli = new CLI(program);
  const spinner = ora().start();

  let found = false;
  let commands = ['deploy','list','register','whoami','login','logout','open','logs','delete','server'];

  for(var i = 0; i < commands.length; i++) {
    let command = commands[i];
    if(program[command]) {
      try {
        found = true;
        await require(`./deploy-${command}`)(cli, spinner);
      } catch(ex) {
        spinner.stop();
        if(ex === 'credentials not found') return console.log('Please login for this action'); // eslint-disable-line
        console.log(`something happened when running ${command} \n ${ex}`); // eslint-disable-line
      }
    }
  }

  // The user simply typed `deploy` let's deploy their application
  // Should only be triggered if help or version flags weren't passed
  if(!found && !program['help'] && !program['version']) {
    try {
      found = true;
      await require(`./deploy-deploy`)(cli, spinner);
    } catch(ex) {
      spinner.stop();
      console.log(`something happened when running deploy \n ${ex}`); // eslint-disable-line
    }
  }

  spinner.stop();
  updateNotifier({pkg}).notify();
}());
