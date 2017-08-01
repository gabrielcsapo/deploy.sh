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
 * @param {String} id - the unique identifier of the application that is to be run
 * @param {String} directory - the directory of which the tar of the application is located
 */
module.exports = function deploy(id, directory) {
  const outputDir = path.resolve(__dirname, '..', 'tmp', id);
  mkdirp.sync(outputDir);

  return new Promise(function(resolve, reject) {
    tar.x({
      file: `${directory}`,
      cwd: outputDir
    }).then(() => {
      const docker = new Docker({
        socketPath: '/var/run/docker.sock'
      });

      Async.waterfall([
        (callback) => {
          const config = classifer(outputDir);
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
            t: id
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
            Image: id,
            name: id,
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
                name: id,
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
