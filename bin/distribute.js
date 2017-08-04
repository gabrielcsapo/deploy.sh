#!/usr/bin/env node

const program = require('commander');
const updateNotifier = require('update-notifier');

const pkg = require('../package.json');

updateNotifier({pkg}).notify();

program
  .version(pkg.version)
  .command('deploy', 'deploy the current directory', { isDefault: true })
  .command('list', 'list depoyments')
  .command('register', 'register a user account')
  .command('login', 'login to access deploy and deployment functionality')
  .command('logout', 'logout and invalidate token')
  .command('open <project>', 'open the deployment instance in the browser')
  .parse(process.argv);
