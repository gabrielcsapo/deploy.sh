var low = require('lowdb');
var db = low('db.json', { storage: require('lowdb/file-sync') });

/**
    ('{app}')(logs),
    ('{app}')(routes)
**/
module.exports = function(app, collection) {
    return db(app + ':' + collection);
}
