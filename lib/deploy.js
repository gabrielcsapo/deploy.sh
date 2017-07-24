const Async = require('async');
const Docker = require('dockerode');
const tar = require('tar');
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');

const classifer = require('./classifier');

/**
 * handles the deployment of an application tar
 * @module lib/deploy
 * @param {String} name - the name of the application that is to be run
 * @param {String} directory - the directory of which the tar of the application is located
 */
module.exports = function deploy(name, directory) {
  const outputDir = path.resolve(__dirname, '..', 'tmp', name);
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
            t: name
          }, callback);
        },
        () => {
          docker.createContainer({
            Image: name,
            name,
            env: [
              'PORT=3000'
            ],
            ExposedPorts: {
              '3000/tcp': {}
            },
            PortBindings: {
              '3000/tcp': [{
                'HostPort': "30001"
              }]
            },
            Privileged: true
          }, (err, container) => {
            if (err) return reject(err);
            container.start((err) => {
              if (err) return reject(err);
              return resolve();
            });
          });
        }
      ], (err) => {
        if (err) return reject(err);
        resolve();
      });
    }).catch((error) => {
      reject(error);
    });
  });
};
