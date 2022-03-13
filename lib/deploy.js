import tar from "tar";
import path from "path";
import fs from "fs";
import { promisify } from "util";

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

import classifer from "./classifier.js";
import { getPort, mk } from "./helpers/util.js";
import Deployment from "./models/deployment.js";

/**
 * handles the deployment of an application tar
 * @module lib/deploy
 * @param {Object} option
 * @param {String} option.name - the name of the the deployment
 * @param {String} option.bundlePath - the directory of which the tar of the application is located
 * @param {String} option.token      - token associated with the user that want to deploy the application
 * @param {String} option.username   - username of the user the token is associated too
 */
export default async function deploy({ name, bundlePath, token, username }) {
  const deployment = await Deployment.get({
    username,
    token,
    name,
    create: true,
  });
  const outputDir = `${process.cwd()}/tmp/${deployment.subdomain}`;

  // makes the directory recursively
  await mk(outputDir);

  await tar.x({
    file: bundlePath,
    cwd: outputDir,
  });

  await Deployment.remove({
    token,
    username,
    subdomain: deployment.subdomain,
  });

  const config = await classifer(outputDir);

  if (config.type === "unknown") {
    throw new Error("deployment not supported");
  }

  if (config.type === "static") {
    await writeFile(
      path.resolve(outputDir, "index.js"),
      (
        await readFile(new URL("static", "static-server.js", import.meta.url))
      ).toString("utf8")
    );
  }

  await writeFile(path.resolve(outputDir, "Dockerfile"), config.build);

  return await Deployment.build({
    name,
    token,
    username,
    subdomain: deployment.subdomain,
    port: await getPort(),
    directory: outputDir,
  });
}
