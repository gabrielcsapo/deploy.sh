const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const crypto = require('crypto');

const { hash } = require('./util');

mongoose.connect('mongodb://localhost/node-distribute');

var UserSchema = new Schema({
  _id: Schema.Types.String,
  username: Schema.Types.String,
  password: Schema.Types.String,
  token: Schema.Types.String,
  deployments: { type: Schema.Types.Mixed, default: {} }
}, {
  minimize: false,
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});
var User = mongoose.model('User', UserSchema);

module.exports = {
  authenticate: function authenticate({ username, token }) {
    return new Promise(function(resolve, reject) {
      User.findOne({
        _id: username,
        token
      }, function(err, user) {
        if(err) return reject(err);
        return resolve({
          username: user.username,
          token: user.token,
          depoyments: user.deployments
        });
      });
    });
  },
  login: function login({ username, password }) {
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
  },
  register: function register({ username, password }) {
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
  },
  getDeployments: function getDeployments({ name, token, username }) {
    return new Promise(function(resolve, reject) {

      User.findOne({
        _id: username,
        token
      }, function(err, user) {
        if(err || !user) return reject('token is no longer valid');

        if(name) {
          if(user.deployments[name]) {
            resolve(user.deployments[name]);
          } else {
            // add a new deployment name
            // TODO: figure out how to avoid collisions
            user.deployments[name] = `${name}-${hash(6)}`;
            user.save();

            resolve(user);
          }
        } else {
          resolve(user.deployments);
        }
      });
    });
  }
};
