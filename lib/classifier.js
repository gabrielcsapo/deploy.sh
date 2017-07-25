const fs = require('fs');
const path = require('path');

/**
 * contains is a function that takes an array and see if the condition matches
 * @method contains
 * @param  {Array} arr      - array to check with rules
 * @param  {Array} contains - rules to make sure the arr contains the following
 * @return {Boolean}        - responds back with a boolean value
 * @example
 * contains(['index.html', 'main.css'], ['index.html', '!Dockerfile', '!package.json'])
 */
var contains = function contains(arr, contains) {
  var conditions = [];
  for(var i in contains) {
    var key = contains[i].substring(0, 1) === '!' ? contains[i].substring(1, contains[i].length) : contains[i];
    conditions.push(contains[i].substring(0, 1) === '!' ? arr.indexOf(key) === -1 : arr.indexOf(key) > -1);
  }
  if(conditions.indexOf(false) > -1) {
    return false;
  }
  return true;
};

/**
 * classifies what type of deployment is needed for a certain directory
 * @module lib/classifier
 * @param  {String}   directory - the directory of which to classify
 * @return {Object}   the configuration needed to deploy
 */
module.exports = function classifier(directory) {
  const files = fs.readdirSync(directory);

  if(contains(files, ['Dockerfile'])) {
    return {
      type: 'docker',
      build: fs.readFileSync(path.resolve(directory, 'Dockerfile'))
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

  if(contains(files, ['package.json'])) {
    return {
      type: 'node',
      build: `
        FROM mhart/alpine-node:base-8
        WORKDIR ${directory}
        ADD . .

        RUN npm install

        CMD ["node", "index.js"]
      `
    };
  }

  return {
    type: 'unknown'
  };
};
