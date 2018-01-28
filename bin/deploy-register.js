#!/usr/bin/env node

const inquirer = require('inquirer');

module.exports = async function(cli, spinner) {
  spinner.stop();
  
  const { username, password } = await inquirer.prompt([
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
  ]);

  const credentials = await cli.register({ username, password });
  await cli.cacheCredentials(credentials);

  console.log(`registered as ${credentials.username}`); // eslint-disable-line
};
