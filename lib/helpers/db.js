const PouchDB = require('pouchdb');
const crypto = require('crypto');

PouchDB.plugin(require('pouchdb-find'));
const db = new PouchDB('node-distribute');

const { hash } = require('./util');

module.exports = {
  authenticate: function authenticate({ username, token }) {
    return new Promise(function(resolve, reject) {
      db.find({
        selector: {
          _id: username,
          token
        },
        limit: 1
      }).then(function (result) {
        if(result.docs.length == 0) return reject();
        return resolve(result.docs[0]);
      }).catch(function (err) {
        return reject(err);
      });
    });
  },
  login: function login({ username, password }) {
    return new Promise(function(resolve, reject) {
      db.get(username, function (err, result) {
        if (err) { return reject(err); }
        const check = crypto.createHash('sha256').update(password).digest('hex');
        if(check === result.password) {
          const user = {
            _id: username,
            token: crypto.createHash('sha256').update(Date.now() + password).digest('hex')
          };
          // Update the user with a new token
          db.put(Object.assign(user, {
            _rev: result._rev,
            password: result.password,
            deployments: result.deployments
          }), (err) => {
            if (err) { return reject(err); }
            resolve(user);
          });
        } else {
          reject('password username combination not correct');
        }
      });
    });
  },
  register: function register({ username, password }) {
    return new Promise(function(resolve, reject) {
      db.put({
        _id: username,
        password: crypto.createHash('sha256').update(password).digest('hex'),
        deployments: []
      }, (err, result) => {
        if(err) return reject(err);
        resolve(result);
      });
    });
  },
  getDeployments: function getDeployments({ name, token, username }) {
    return new Promise(function(resolve, reject) {
      db.find({
        selector: {
          _id: username,
          token,
        },
        limit: 1
      }).then(function (result) {
        if(!result.docs[0]) reject({ error: 'no account found' });
        const account = result.docs[0];
        if(!account.deployments) {
          account.deployments = {};
        }
        if(name) {
          if(account.deployments[name]) {
            resolve(account.deployments[name]);
          } else {
            // add a new deployment name
            // TODO: figure out how to avoid collisions
            account.deployments[name] = `${name}-${hash(6)}`;
            db.put(account, (err) => {
              if (err) { return reject(err); }
              resolve(account.deployments[name]);
            });
          }
        } else {
          resolve(account.deployments);
        }
      }).catch(function (err) {
        reject(err);
      });
    });
  }
};
