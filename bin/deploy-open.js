#!/usr/bin/env node

import Url from 'url';
import opn from 'opn';
import ora from 'ora';

export default async function(cli) {
  const spinner = ora().start();

  spinner.text = 'Opening up url to deployment instance';

  const { token, username } = await cli.getCredentials();
  const { deployment } = await cli.getDeployments({ token, username, name: cli.application });

  const config = Url.parse(cli.url);
  config.host = `${deployment.subdomain}.${config.host}`;
  const url = Url.format(config);

  spinner.text = `Opening deployment at ${url}`;
  spinner.stopAndPersist();
  opn(url, { wait: false });
};
