var express = require('express');
var app = express();

var path = require('path');
var crypto = require('crypto');
var basicAuth = require('basic-auth-connect');
var kue = require('kue');
var bunyan = require('bunyan');
var log = bunyan.createLogger({name: "node-distribute"});

var startup = require('./operations/startup.js');

// TODO: add checks to make sure the data is not malformed
var user = require('./config/user.json');
var repos = require('./config/repos.json');

var gitserver = require('./operations/startup-gitserver.js')(log, user, repos);

var port = process.env.PORT || 1337;

// TODO: should show process values using the PM2 logs?
// TODO: admin portal should be able to add repos
// TODO: admin portal should be able to add users
// TODO: admin portal should record statics from all apps being run (geo, users, traffic, etc)
// TODO: admin portal should show all of that data
app.use(basicAuth(user.username, user.password));
app.use(function(req, res, next) {
    next();
});
app.use('/admin/queue', kue.app);

app.listen(port, function() {
    log.info('node-distribute listening on http://localhost:' + port)
});
