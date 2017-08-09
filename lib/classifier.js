const fs = require('fs');
const path = require('path');

const { contains } = require('./helpers/util');

/**
 * classifies what type of deployment is needed for a certain directory
 * @module lib/classifier
 * @param  {String}   directory - the directory of which to classify
 * @return {Object}   the configuration needed to deploy
 */
module.exports = function classifier(directory) {
  const files = fs.readdirSync(directory);
  
  if(contains(files, ['Dockerfile'])) {
    let build = fs.readFileSync(path.resolve(directory, 'Dockerfile')).toString('utf8');
    build = build.replace(/\$\{directory\}/, directory);

    return {
      type: 'docker',
      build
    };
  }

  if(contains(files, ['package.json'])) {
    return {
      type: 'node',
      build: `
        FROM mhart/alpine-node:8
        WORKDIR ${directory}
        ADD . .

        RUN npm install

        CMD ["npm", "start"]
      `
    };
  }

  if(contains(files, ['index.html', '!Dockerfile', '!package.json'])) {
    return {
      type: 'static',
      build: `
        FROM mhart/alpine-node:base-8
        WORKDIR ${directory}
        ADD . .

        CMD ["node", "index.js"]
      `
    };
  }

  return {
    type: 'unknown'
  };
};
