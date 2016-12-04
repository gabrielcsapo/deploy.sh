/**
 * Starts the admin portal
 * @module startup-admin
 */
process.env.VUE_ENV = 'server';

var express = require('express');
var app = express();
var kue = require('kue');
var path = require('path');
var user = require('./lib/user');
var basicAuth = require('basic-auth-connect');
var port = process.env.PORT;

var isAuthenticated = function(req, res, next) {
    // Opens the door to having a server that is not authentication protected
    // This helps with local debugging
    if (user.get().username && user.get().password) {
        return basicAuth(user.get().username, user.get().password)(req, res, next);
    } else {
        next();
    }
};

kue.app.set('title', 'node-distribute');

app.use('/queue', isAuthenticated, kue.app);
app.use('/assets/', isAuthenticated, express.static(path.resolve(__dirname, 'views', 'admin', 'dist')));
app.use('/', isAuthenticated, function(req, res) {
    res.sendFile(path.resolve(__dirname, 'views', 'admin', 'index.html'));
});

app.use(function(req, res) {
    res.status(404);
    res.sendFile(path.resolve(__dirname, 'views/404/index.html'));
});

app.listen(port, function() {
    console.log('node-distribute admin listening on http://localhost:' + port); // eslint-disable-line no-console
});
