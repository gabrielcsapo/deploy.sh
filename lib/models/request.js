/**
 * @module models/request
 */

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const RequestSchema = new Schema({
  hostname: String,
  url: String,
  time: Number,
  userAgent: String,
  referer: String,
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
 * @property {String} hostname - the hostname of the request
 * @property {String} url - the url that was being accessed
 * @property {Number} time - the time it took to access the resource
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
  const { url, headers } = req;
  const { host } = headers;

  const hostname = host.split('.')[0];
  const startAt = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(startAt);
    const time = diff[0] * 1e3 + diff[1] * 1e-6;

    Request.create({
      url,
      time,
      hostname,
      userAgent: headers['user-agent'],
      referer: headers['referer'],
      acceptLanguage: headers['accept-language']
    });
  });

  next();
};
