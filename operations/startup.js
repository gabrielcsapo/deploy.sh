var fs = require('fs');
var path = require('path');

module.exports = (function() {
    fs.mkdir(path.resolve(__dirname, '..', 'config'),function(){});
    require('./startup-gitserver.js')();
    require('./startup-applications')(function() {
      require('./startup-admin.js')();
    });
}());
