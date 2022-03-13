#!/usr/bin/env node

export default async function(cli, spinner) {
  const { default: importCommand } = await import('../index.js');

  importCommand(cli, spinner);
};
