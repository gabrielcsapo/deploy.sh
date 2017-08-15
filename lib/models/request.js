/**
 * @module models/request
 */

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const RequestSchema = new Schema({
  url: String,
  time: Number,
  subdomain: String,
  statusCode: String,
  userAgent: String,
  referer: String,
  method: String,
  acceptLanguage: String
}, {
  minimize: false,
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

/**
 * Request definition
 * @class {Object} Request
 * @property {String} subdomain - the subdomain of the request
 * @property {String} url - the url that was being accessed
 * @property {Number} time - the time it took to access the resource
 * @property {String} method - the http verb that describes the request
 * @property {String} statusCode - the statusCode associated with the request
 * @property {String} userAgent - the userAgent that access the resource
 * @property {String} referer - the referer that the user was at before accessing the address
 * @property {String} acceptLanguage - browser based language preferences
 */
const Request = mongoose.model('Request', RequestSchema);

/**
 * express middleware that logs requests
 * @method log
 * @param  {Object}   req  - express request object
 * @param  {Object}   res  - express response object
 * @param  {Function} next - callback function
 */
module.exports.log = function log(req, res, next) {
  const { url, headers, method } = req;
  const { host } = headers;

  const subdomain = host.split('.')[0];
  const startAt = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(startAt);
    const time = diff[0] * 1e3 + diff[1] * 1e-6;

    const { statusCode } = res;

    Request.create({
      url,
      time,
      subdomain,
      method,
      statusCode,
      userAgent: headers['user-agent'],
      referer: headers['referer'],
      acceptLanguage: headers['accept-language']
    });
  });

  next();
};

/**
 * returns the amount of requests for the specified subdomain
 * @method count
 * @param  {string} subdomain - the subdomain of which to get the count of requests for
 * @return {Promise}
 */
module.exports.count = function count({ subdomain }) {
  return new Promise(function(resolve, reject) {
    Request.count({
      subdomain
    }, (err, count) => {
      if(err) return reject(err);
      return resolve(count);
    });
  });
};

/**
 * removes all entries associated with a particular subdomain
 * @method del
 * @param  {String} subdomain - the subdomain that the entries are related to
 * @return {Promise}
 */
module.exports.del = function del({ subdomain }) {
  return new Promise(function(resolve, reject) {
    Request.remove({
      subdomain
    }, (err) => {
      if(err) return reject(err);
      return resolve();
    });
  });
};
