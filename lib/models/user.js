/**
 * @module models/user
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  _id: String,
  username: String,
  password: String,
  token: String
}, {
  minimize: false,
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

const User = mongoose.model('User', UserSchema);

/**
 * User definition
 * @class {Object} User
 * @property {String} username - a string that defines the user's accounts
 * @property {String} password - a password for the user
 * @property {String=} token - an access token
 */
module.exports.User = User;

/**
 * middleware to verify the username and token are valid, will then set the user to req.user
 * @function authenticate
 * @param {Object} req - express request
 * @param {Object} res - express response
 * @param {Function} next - callback to go to next middleware
 */
module.exports.authenticate = function authenticate(req, res, next) {
  const { headers } = req;
  const username = headers['x-deploy-username'];
  const token = headers['x-deploy-token'];
  if(!username && !token) {
    res.status(500).send({ error: 'authentication necessary' });
  }

  User.findOne({
    _id: username,
    token
  }, function(err, user) {
    if(err || !user) return res.status(500).send({ error: 'not authenticated' });
    req.user = {
      username: user.username,
      token: user.token,
      depoyments: user.deployments
    };
    next();
  });
};

/**
 * logs out a user by deleting their token
 * @method logout
 * @param  {String} token      - the token associated with the username
 * @param  {String} username   - the username of the user
 * @return {Promise}
 */
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

/**
 * logs in a user and returns
 * @method login
 * @param  {String} username - the username of the user who is logging in
 * @param  {String} password - the password associated with the user
 * @return {Promise}
 */
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
          token: user.token
        });
      });
    });
  });
};

/**
 * registers a user
 * @method register
 * @param  {String} username - the username of the user who is logging in
 * @param  {String} password - the password associated with the user
 * @return {Promise}
 */
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

/**
 * returns the user if token and username are valid
 * @method get
 * @param  {String} token      - the token associated with the username
 * @param  {String} username   - the username of the user
 * @return {Promise}
 */
module.exports.get = function get({ token, username }) {
  return new Promise(function(resolve, reject) {
      User.findOne({
        _id: username,
        token
      }, function(err, user) {
        if(err || !user) return reject('token is no longer valid');
        return resolve(user);
    });

  });
};
