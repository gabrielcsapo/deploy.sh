const tar = require('tar');
const path = require('path');
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
      const build = classifer(outputDir);
      console.log(build);
      
      resolve();
    }).catch((error) => {
      reject(error);
    })
  });
}
