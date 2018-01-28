#!/usr/bin/env node

module.exports = async function(cli, spinner) {
  await require('../index.js')(cli, spinner);
};
