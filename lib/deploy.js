const Async = require('async');
const Docker = require('dockerode');
const tar = require('tar');
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');

const classifer = require('./classifier');

const { getPort } = require('./helpers/util');

/**
 * handles the deployment of an application tar
 * @module lib/deploy
 * @param {String} subdomain - the unique identifier of the application that is to be run
 * @param {String} bundlePath - the directory of which the tar of the application is located
 */
module.exports = function deploy(subdomain, bundlePath) {
  const outputDir = path.resolve(__dirname, '..', 'tmp', subdomain);
  mkdirp.sync(outputDir);

  return new Promise(function(resolve, reject) {
    tar.x({
      file: bundlePath,
      cwd: outputDir
    }).then(() => {
      const docker = new Docker({
        socketPath: '/var/run/docker.sock'
      });

      Async.waterfall([
        (callback) => {
          let found = false;
          docker.listContainers({
            all: 1
          }, (err, containers) => {
            if(err) return callback(err, null);
            containers.forEach((container) => {
              if(container.Image == subdomain) {
                found = true;
                const old = docker.getContainer(container.Id);
                old.stop(() => {
                  // ignore any errors with it being stopped already
                  old.remove(() => {
                    callback();
                  });
                });
              }
            });
            if(!found) return callback();
          });
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
          docker.buildImage({
            context: outputDir,
            src: fs.readdirSync(outputDir)
          }, {
            t: subdomain
          }, (err, stream) => {
            if(err) return callback(err);
            docker.modem.followProgress(stream, onFinished, onProgress);

            function onFinished(err) {
              if(err) return callback(err);
              callback();
            }
            // TODO: be able to stream the output of this to a socket to give real time updates
            // onProgress(ev)
            function onProgress() {
              // console.log(ev);
            }
          });
        },
        (callback) => {
          getPort(callback);
        },
        (port, callback) => {
          // TODO: before create a container, check for existing one to remove
          docker.createContainer({
            Image: subdomain,
            name: subdomain,
            env: [
              'PORT=3000'
            ],
            ExposedPorts: {
              '3000/tcp': {}
            },
            PortBindings: {
              '3000/tcp': [{
                'HostPort': `${port}`
              }]
            },
            Privileged: true
          }, (err, container) => {
            if (err) return callback(err);
            container.start((err) => {
              if (err) return callback(err);
              return callback(null, {
                port,
                id: container.id,
                subdomain,
                directory: outputDir
              });
            });
          });
        }
      ], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    }).catch((error) => {
      reject(error);
    });
  });
};
