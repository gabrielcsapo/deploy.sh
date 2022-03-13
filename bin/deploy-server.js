#!/usr/bin/env node

import ora from 'ora';

export default async function(cli) {
  const spinner = ora().start();

  const { default: importCommand } = await import('../index.js');

  importCommand(cli, spinner);
};
