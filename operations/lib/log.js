var db = require('./db');
var moment = require('moment');
var bunyan = require('bunyan');
var Log = bunyan.createLogger({name: 'node-distribute'});

Log.application = function(application, data, type) {
  var formatted = (type || 'LOG') + ' ' + moment().format() + ': ' +  data;
  db(application, 'logs').push(formatted);
  return formatted;
};

module.exports = Log;
