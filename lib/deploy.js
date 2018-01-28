const tar = require('tar');
const path = require('path');
const fs = require('fs');

const { promisify } = require('util');

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

const classifer = require('./classifier');

const { getPort, mk } = require('./helpers/util');
const { get, build, remove } = require('./models/deployment');

/**
 * handles the deployment of an application tar
 * @module lib/deploy
 * @param {Object} option
 * @param {String} option.name - the name of the the deployment
 * @param {String} option.bundlePath - the directory of which the tar of the application is located
 * @param {String} option.token      - token associated with the user that want to deploy the application
 * @param {String} option.username   - username of the user the token is associated too
 */
module.exports = async function deploy({ name, bundlePath, token, username }) {
  const deployment = await get({ username, token, name, create: true });
  const outputDir = `${process.cwd()}/tmp/${deployment.subdomain}`;

  // makes the directory recursively
  await mk(outputDir);

  await tar.x({
    file: bundlePath,
    cwd: outputDir
  });

  await remove({
    token,
    username,
    subdomain: deployment.subdomain
  });

  const config = await classifer(outputDir);

  if (config.type === 'unknown') {
    throw new Error('deployment not supported');
  }

  if (config.type === 'static') {
    await writeFile(path.resolve(outputDir, 'index.js'), (await readFile(path.resolve(__dirname, 'static', 'static-server.js'))).toString('utf8'));
  }

  await writeFile(path.resolve(outputDir, 'Dockerfile'), config.build);

  return await build({
    name,
    token,
    username,
    subdomain: deployment.subdomain,
    port: await getPort(),
    directory: outputDir
  });
};
