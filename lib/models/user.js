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

const UserModel = mongoose.model('User', UserSchema);

/**
 * User definition
 * @class User
 * @property {String} username - a string that defines the user's accounts
 * @property {String} password - a password for the user
 * @property {String=} token - an access token
 */
class User {
  /**
   * middleware to verify the username and token are valid, will then set the user to req.user
   * @function authenticateMiddleware
   * @memberof User
   * @param {Object} req - express request
   * @param {Object} res - express response
   * @param {Function} next - callback to go to next middleware
   */
  static async authenticateMiddleware(req, res, next) {
    const username = req.headers['x-deploy-username'];
    const token = req.headers['x-deploy-token'];

    if(!username && !token) {
      res.status(500).send({ error: 'authentication necessary' });
    }

    req.user = await User.authenticate(username, token);

    next();
  }
  /**
   * verify the username and token are valid
   * @method authenticate
   * @memberof User
   * @param  {String} token      - the token associated with the username
   * @param  {String} username   - the username of the user
   * @return {Promise}
   */
  static async authenticate(username, token) {
    let user = await UserModel.findOne({
      _id: username,
      token
    });

    if(!user) throw new Error('not authenticated');

    return {
      username: user.username,
      token: user.token
    };
  }
  /**
   * logs out a user by deleting their token
   * @method logout
   * @memberof User
   * @param  {String} token      - the token associated with the username
   * @param  {String} username   - the username of the user
   * @return {Promise}
   */
  static async logout({ token, username }) {
    let user = await UserModel.findOne({
      _id: username,
      token
    });

    if(!user) throw new Error('token and username not valid');

    user.token = '';

    return await user.save();
  }
  /**
   * logs in a user and returns
   * @method login
   * @memberof User
   * @param  {String} username - the username of the user who is logging in
   * @param  {String} password - the password associated with the user
   * @return {Promise}
   */
  static async login({ username, password }) {
    let user = await UserModel.findOne({
      _id: username,
      password: crypto.createHash('sha256').update(password).digest('hex')
    });

    if(!user) throw new Error('password username combination not correct');

    user.token = crypto.createHash('sha256').update(Date.now() + password + username).digest('hex');
    await user.save();

    return {
      username: user.username,
      token: user.token
    };
  }
  /**
   * registers a user
   * @method register
   * @memberof User
   * @param  {String} username - the username of the user who is logging in
   * @param  {String} password - the password associated with the user
   * @return {Promise}
   */
  static async register({ username, password }) {
    let user = await UserModel.create({
      _id: username,
      username,
      password: crypto.createHash('sha256').update(password).digest('hex'),
      token: crypto.createHash('sha256').update(Date.now() + password + username).digest('hex')
    });

    return {
      username: user.username,
      token: user.token,
      depoyments: user.deployments
    };
  }
}

module.exports = User;
