const Async = require('async');
const tar = require('tar');
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');

const classifer = require('./classifier');

const { getPort } = require('./helpers/util');
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
module.exports = function deploy({ name, bundlePath, token, username }) {
  return new Promise(function(resolve, reject) {
    get({ username, token, name, create: true })
      .then((deployment) => {
        const outputDir = path.resolve(__dirname, '..', 'tmp', deployment.subdomain);
        mkdirp.sync(outputDir);

        tar.x({
            file: bundlePath,
            cwd: outputDir
          }).then(() => {
            Async.waterfall([
              (callback) => {
                remove({
                  token,
                  username,
                  name: deployment.subdomain
                })
                  .then(() => callback())
                  .catch((ex) => callback(ex));
              },
              (callback) => {
                const config = classifer(outputDir);
                if (config.type === 'unknown') {
                  callback('deployment not supported', null);
                }
                if (config.type === 'static') {
                  fs.writeFileSync(path.resolve(outputDir, 'index.js'), fs.readFileSync(path.resolve(__dirname, 'helpers', 'static-server.js')));
                }
                callback(null, config.build);
              },
              (config, callback) => {
                fs.writeFile(path.resolve(outputDir, 'Dockerfile'), config, callback);
              },
              (callback) => {
                getPort(callback);
              },
              (port, callback) => {
                build({
                  name,
                  token,
                  username,
                  subdomain: deployment.subdomain,
                  port,
                  directory: outputDir
                })
                  .then((deployment) => callback(null, deployment))
                  .catch((ex) => callback(ex));
              }
            ], (err, result) => {
              if (err) return reject(err);
              resolve(result);
            });
          })
          .catch((ex) => reject(ex));
      });
  });
};
