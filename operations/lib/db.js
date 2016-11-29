var flat = require('node-flat-db');
var db = flat('db.json', { storage: require('node-flat-db/file-sync') });

/**
 * Exports the underlying node-flat-db structure
 * @module db
 * @param  {string} app        the name of the application
 * @param  {string} collection the internal collection that is to be manipulated (logs, memory, cpu, etc)
 * @example require('./db')('{app}-logs')
 * @return {object}
 */
module.exports = function(app, collection) {
    return db(app + ':' + collection);
};
