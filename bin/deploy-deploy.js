#!/usr/bin/env node

import fs from "fs";
import path from "path";
import ora from "ora";

export default async function (cli) {
  const spinner = ora().start();

  spinner.text = "Creating application bundle";

  await cli.createBundle(process.cwd());

  spinner.text = "Getting deploy keys";

  const { token, username } = await cli.getCredentials();

  spinner.text = "Uploading application bundle";

  const bundle = fs.readFileSync(path.resolve(process.cwd(), "bundle.tgz"));

  const { deployment } = await cli.uploadBundle({
    name: path.basename(process.cwd()),
    bundle,
    token,
    username,
  });

  spinner.text = "Cleaning up local files";

  await cli.removeBundle(process.cwd());

  spinner.succeed(
    `Upload successfully, http://${deployment.subdomain}.localhost:5000`
  );
}
