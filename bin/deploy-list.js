#!/usr/bin/env node
import moment from 'moment';
import Url from 'url';
import Table from 'turtler';
import ora from 'ora';

export default async function(cli) {
  const spinner = ora().start();

  spinner.text = 'Getting deployment list';

  const { token, username } = await cli.getCredentials();
  const { deployments } = await cli.getDeployments({ token, username });

  spinner.stop();

  if(deployments.length > 0) {
    let data = [["name", "url", "age", "requests", "status"]];

    deployments.forEach((r, i) => {
      const config = Url.parse(cli.url);
      config.host = `${r.subdomain}.${config.host}`;
      const url = Url.format(config);

      data[i + 1] = [r.name, url, moment(r.updated_at).fromNow(), r.requests.toString(), r.status];
    });

    let table = new Table(data);

    console.log(table.markdown()); // eslint-disable-line
  } else {
    console.log('0 deployments found'); // eslint-disable-line
  }
};
