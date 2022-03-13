import mongoose from "mongoose";

const Schema = mongoose.Schema;

const RequestSchema = new Schema(
  {
    url: String,
    time: Number,
    subdomain: String,
    statusCode: String,
    userAgent: String,
    referer: String,
    method: String,
    acceptLanguage: String,
  },
  {
    minimize: false,
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

const RequestModel = mongoose.model("Request", RequestSchema);

/**
 * Request definition
 * @class Request
 * @property {String} subdomain - the subdomain of the request
 * @property {String} url - the url that was being accessed
 * @property {Number} time - the time it took to access the resource
 * @property {String} method - the http verb that describes the request
 * @property {String} statusCode - the statusCode associated with the request
 * @property {String} userAgent - the userAgent that access the resource
 * @property {String} referer - the referer that the user was at before accessing the address
 * @property {String} acceptLanguage - browser based language preferences
 */
class Request {
  /**
   * express middleware that logs requests
   * @method log
   * @memberof Request
   * @param  {Object}   req  - express request object
   * @param  {Object}   res  - express response object
   * @param  {Function} next - callback function
   */
  static log(req, res, next) {
    const { url, headers, method } = req;
    const { host } = headers;

    const subdomain = host.split(".")[0];
    const startAt = process.hrtime();

    res.on("finish", () => {
      const diff = process.hrtime(startAt);
      const time = diff[0] * 1e3 + diff[1] * 1e-6;

      const { statusCode } = res;

      RequestModel.create({
        url,
        time,
        subdomain,
        method,
        statusCode,
        userAgent: headers["user-agent"],
        referer: headers["referer"],
        acceptLanguage: headers["accept-language"],
      });
    });

    next();
  }
  /**
   * returns the amount of requests for the specified subdomain
   * @method count
   * @memberof Request
   * @param  {string} subdomain - the subdomain of which to get the count of requests for
   * @return {Promise}
   */
  static async count({ subdomain }) {
    return await RequestModel.count({
      subdomain,
    });
  }
  /**
   * removes all entries associated with a particular subdomain
   * @method del
   * @memberof Request
   * @param  {String} subdomain - the subdomain that the entries are related to
   * @return {Promise}
   */
  static async del({ subdomain }) {
    return await RequestModel.deleteMany({
      subdomain,
    });
  }
}

export default Request;
