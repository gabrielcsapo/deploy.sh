#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

module.exports = async function(cli, spinner) {
  spinner.text = 'Creating application bundle';

  await cli.createBundle(process.cwd());

  spinner.text = 'Getting deploy keys';

  const { token, username } = await cli.getCredentials();

  spinner.text = 'Uploading application bundle';

  const bundle = fs.createReadStream(path.resolve(process.cwd(), 'bundle.tgz'));

  const { deployment } = await cli.uploadBundle({
    name: path.basename(process.cwd()),
    bundle,
    token,
    username
  });

  spinner.text = 'Cleaning up local files';

  await cli.removeBundle(process.cwd());

  spinner.succeed(`Upload successfully, http://${deployment.subdomain}.localhost:5000`);
};
