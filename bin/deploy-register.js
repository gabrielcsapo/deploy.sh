#!/usr/bin/env node

const Async = require('async');
const inquirer = require('inquirer');

const program = require('commander');
program
    .option('-u, --url [url]', 'The endpoint of the deploy.sh server', 'http://localhost:5000')
    .parse(process.argv);

const { saveCredentials, register } = require('../lib/helpers/cli')(program.url);

Async.waterfall([
  function(callback) {
    inquirer.prompt([
      {
        name: 'username',
        type: 'input',
        message: 'Enter a valid e-mail address:',
        validate: function( value ) {
          if (value.length > 0 && value.indexOf('@') > -1 && value.indexOf('.') > -1) {
            return true;
          } else {
            return 'Please enter a valid e-mail address';
          }
        }
      },
      {
        name: 'password',
        type: 'password',
        message: 'Enter a password:',
        mask: true,
        validate: function(value) {
          if (value.length) {
            return true;
          } else {
            return 'Please enter a password';
          }
        }
      }
    ])
    .then((credentials) => {
      const { username, password } = credentials;
      register({ username, password })
        .then((credentials) => {
          return saveCredentials(credentials);
        })
        .then((credentials) => callback(null, credentials));
    })
    .catch((err) => callback(err, null));
  }
], (ex, result) => {
  if (ex) return console.error(`Register failed 🙈 ${JSON.stringify({ // eslint-disable-line
    ex
  }, null, 4)}`);

  console.log(`registered as ${result.username}`); // eslint-disable-line
});
