const mongoose = require('mongoose');
const crypto = require('crypto');

const Schema = mongoose.Schema;
const { hash } = require('./util');

mongoose.connect('mongodb://localhost/node-distribute');
mongoose.Promise = global.Promise;

var DeploymentSchema = new Schema({
  id: String,
  port: Number,
  project: String,
  directory: String
});

var UserSchema = new Schema({
  _id: String,
  username: String,
  password: String,
  token: String,
  deployments: { type: [DeploymentSchema], default: [] }
}, {
  minimize: false,
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});
var User = mongoose.model('User', UserSchema);

module.exports.authenticate = function authenticate({ username, token }) {
  return new Promise(function(resolve, reject) {
    User.findOne({
      _id: username,
      token
    }, function(err, user) {
      if(err || !user) return reject('user could not be authenticated');
      return resolve({
        username: user.username,
        token: user.token,
        depoyments: user.deployments
      });
    });
  });
};

module.exports.logout = function logout({ token, username }) {
  return new Promise(function(resolve, reject) {
    User.findOne({
      _id: username,
      token
    }, function(err, user) {
      if(err || !user) return reject('token and username not valid');
      user.token = '';
      user.save((err) => {
        if(err) return reject('erro removing token from the database');
        return resolve();
      });
    });
  });
};

module.exports.login = function login({ username, password }) {
  return new Promise(function(resolve, reject) {
    User.findOne({
      _id: username,
      password: crypto.createHash('sha256').update(password).digest('hex')
    }, function(err, user) {
      if(err || !user) return reject('password username combination not correct');
      user.token = crypto.createHash('sha256').update(Date.now() + password + username).digest('hex');
      user.save((err) => {
        if(err) return reject('erro persisting token to database');
        return resolve({
          username: user.username,
          token: user.token,
          depoyments: user.deployments
        });
      });
    });
  });
};

module.exports.register = function register({ username, password }) {
  return new Promise(function(resolve, reject) {
    User.create({
      _id: username,
      username,
      password: crypto.createHash('sha256').update(password).digest('hex'),
      token: crypto.createHash('sha256').update(Date.now() + password + username).digest('hex')
    }, function(error, user) {
      if(error) return reject(error);
      resolve({
        username: user.username,
        token: user.token,
        depoyments: user.deployments
      });
    });
  });
};

module.exports.updateDeployments = function updateDeployments({ name, token, username, deployment }) {
  return new Promise(function(resolve, reject) {
      User.findOne({
        _id: username,
        token
      }, function(err, user) {
        if(err || !user) return reject('token is no longer valid');
        var found = false;
        user.deployments.forEach((d, i) => {
          if(d.project == name) {
            found = true;
            user.deployments[i] = Object.assign(d, deployment);
          }
        });
        if(!found) {
          deployment.project = name;
          user.deployments.push(deployment);
        }
        user.markModified('deployments');
        user.save((err) => {
          if(err) return reject('issue updating deployment');
          return resolve(user);
        });
    });

  });
};

module.exports.getProxy = function getProxy({ name }) {
  return new Promise(function(resolve, reject) {
    User.findOne({
       "deployments.id":{
          "$eq": name
       }
    }, {
      "deployments.port": 1
    }, (err, result) => {
      if(err) return reject(err);
      return resolve(result.deployments[0].port);
    });
  });
};

module.exports.getDeployments = function getDeployments({ name, token, username }) {
  return new Promise(function(resolve, reject) {

    User.findOne({
      _id: username,
      token
    }, function(err, user) {
      if(err || !user) return reject('token is no longer valid');

      if(name) {
        var found = false;
        user.deployments.forEach((d, i) => {
          if(d.project == name) {
            found = true;
            resolve(user.deployments[i]);
          }
        });
        if(!found) {
          // add a new deployment name
          // TODO: figure out how to avoid collisions
          const deployment = {
            project: name,
            id: `${name}-${hash(6)}`
          };
          user.deployments.push(deployment);
          user.save((err) => {
            if(err) return reject('issue updating deployment');
            resolve(deployment);
          });
        }
      } else {
        resolve(user.deployments);
      }
    });
  });
};
