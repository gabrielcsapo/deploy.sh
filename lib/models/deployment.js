/**
 * @module models/deployment
 */

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const User = require('./user');
const { hash } = require('../helpers/util');

const DeploymentSchema = new Schema({
  id: String,
  name: String,
  port: Number,
  subdomain: String,
  directory: String,
  username: String
}, {
  minimize: false,
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

/**
 * Deployment definition
 * @class {Object} Deployment
 * @property {String} id - the container id
 * @property {String} name - the name of the deployment
 * @property {Number} port - the port that the container has exposed
 * @property {String} subdomain - the subdomain of the application
 * @property {String} directory - the directory of tared application
 * @property {String} username - the username who owns the deployment
 */
const Deployment = mongoose.model('Deployment', DeploymentSchema);

/**
 * [updateDeployments description]
 * @method updateDeployments
 * @param  {Object} options
 * @param  {String} options.name       - the name of the deployment
 * @param  {String} options.token      - the token for the user who owns the deployment
 * @param  {String} options.username   - the username associated with this deployment
 * @param  {Deployment} options.deployment - a deployment model that contains the updates that will be applied
 * @return {Promise}
 */
module.exports.updateDeployments = function updateDeployments({ name, token, username, deployment }) {
  return new Promise(function(resolve, reject) {
      User.get({
        username,
        token
      })
        .then((user) => {
          if(!user) return reject('not authenticated');
          Deployment.findOne({
            username,
            name
          }, (err, found) => {
            if(found) {
              found.id = deployment.id || found.id;
              found.name = deployment.name || found.name;
              found.port = deployment.port || found.port;
              found.subdomain = deployment.subdomain || found.subdomain;
              found.directory = deployment.directory || found.directory;
              found.save((err) => {
                if(err) return reject(err);
                resolve(found);
              });
            } else {
              const deployment = {
                name,
                subdomain: `${name}-${hash(6)}`,
                username
              };
              Deployment.create(deployment, (err, deployment) => {
                if(err) return reject(err);
                return resolve(deployment);
              });
            }
          });
        })
        .catch((ex) => reject(ex));
  });
};

/**
 * gets the port for the requested subdomain
 * @method getProxy
 * @param  {String} subdomain - the subdomain for the application being requested
 * @return {Promise}
 */
module.exports.getProxy = function getProxy({ subdomain }) {
  return new Promise(function(resolve, reject) {
    Deployment.findOne({
       "subdomain":{
          "$eq": subdomain
       }
    }, (err, deployment) => {
      if(err || !deployment) return reject(err);
      return resolve(deployment.port);
    });
  });
};

/**
 * gets a specific deployment if name is passed or all deployments for the specified user
 * @method getDeployments
 * @param  {Object}  options
 * @param  {String=} options.name     - the name of the deployment
 * @param  {String} options.token      - the token for the user who owns the deployment
 * @param  {String} options.username   - the username associated with this deployment
 * @return {Promise}
 */
module.exports.getDeployments = function getDeployments({ name, token, username }) {
  return new Promise(function(resolve, reject) {
    User.get({
      username,
      token
    })
      .then((user) => {
        if(!user) return reject('not authenticated');

        if(!name) {
          Deployment.find({
            username
          }, (err, deployments) => {
            if(err) return reject(err);

            resolve(deployments);
          });
        } else {
          Deployment.findOne({
            username,
            name
          }, (err, deployment) => {
            if(deployment) {
              return resolve(deployment);
            } else {
              // add a new deployment name
              // TODO: figure out how to avoid collisions
              const deployment = {
                name,
                subdomain: `${name}-${hash(6)}`,
                username
              };
              Deployment.create(deployment, (err) => {
                if(err) return reject('issue updating deployment');
                resolve(deployment);
              });
            }
          });
        }
      })
      .catch((ex) => reject(ex));
  });
};
