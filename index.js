var bunyan = require('bunyan');
var log = bunyan.createLogger({name: "node-distribute"});

var startup = require('./operations/startup.js');

// TODO: add checks to make sure the data is not malformed
var user = require('./config/user.json');
var repos = require('./config/repos.json');

var gitserver = require('./operations/startup-gitserver.js')(log, user, repos);
var admin = require('./operations/startup-admin.js')(log, user, repos);
