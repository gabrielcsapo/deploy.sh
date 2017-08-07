#!/usr/bin/env node

const Async = require('async');
const inquirer = require('inquirer');

const program = require('commander');
program
    .option('-u, --url [url]', 'The endpoint of the distribute.sh server', 'http://localhost:5000')
    .parse(process.argv);

const { saveCredentials, login } = require('../lib/helpers/cli')(program.url);

Async.waterfall([
  function(callback) {
    inquirer.prompt([
      {
        name: 'username',
        type: 'input',
        message: 'Enter your e-mail address:',
        validate: function( value ) {
          if (value.length > 0 && value.indexOf('@') > -1 && value.indexOf('.') > -1) {
            return true;
          } else {
            return 'Please enter your e-mail address';
          }
        }
      },
      {
        name: 'password',
        type: 'password',
        message: 'Enter your password:',
        mask: true,
        validate: function(value) {
          if (value.length) {
            return true;
          } else {
            return 'Please enter your password';
          }
        }
      }
    ]).then((credentials) => {
      const { username, password } = credentials;
      return login({ username, password})
        .then((credentials) => {
          return saveCredentials(credentials);
        })
        .then((credentials) => {
          callback(null, credentials);
        });
    })
    .catch((ex) => callback(ex, null));
  }
], (ex, result) => {
  if (ex) return console.error(`Login failed 🙈 ${JSON.stringify({ // eslint-disable-line
    ex
  }, null, 4)}`);

  console.log(`Successfully logged in as ${result.username}`); // eslint-disable-line
});
