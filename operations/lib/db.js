var flat = require('node-flat-db');
var db = flat('db.json', { storage: require('node-flat-db/file-sync') });

/**
    ('{app}')(logs),
    ('{app}')(routes)
**/
module.exports = function(app, collection) {
    return db(app + ':' + collection);
}
