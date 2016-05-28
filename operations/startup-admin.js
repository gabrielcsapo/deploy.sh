var express = require('express');
var app = express();
var basicAuth = require('basic-auth-connect');
var kue = require('kue');
var Promise = require('bluebird');
var path = require('path');

var GitDeploy = require('./git-deploy.js');

var httpProxy = require('http-proxy');
var proxy = httpProxy.createProxyServer({});
var pm2 = require('pm2');

var log = require('./lib/log');

// TODO: cleanup 🖕
module.exports = function(user, repos) {
    require('./startup-applications')(repos);

    var port = process.env.PORT || 1337;

    pm2.launchBus(function(err, bus) {
        bus.on('log:out', function(data) {
            if (!GLOBAL.logs[data.process.name]) {
                GLOBAL.logs[data.process.name] = [];
            }
            GLOBAL.logs[data.process.name].push(data.data);
        });
    });

    app.set('views', './operations/views')
    app.set('view engine', 'pug');
    kue.app.set('title', 'node-distribute');

    var isAuthenticated = function(req, res, next) {
        // Opens the door to having a server that is not authentication protected
        // This helps with local debugging
        if (user.username && user.password) {
            var hostname = req.headers.host.split(":")[0];
            hostname = hostname.substring(0, hostname.indexOf('.'));
            if (hostname == 'admin') {
                return basicAuth(user.username, user.password)(req, res, next);
            } else {
                next();
            }
        } else {
            next();
        }
    }

    app.use('/queue', isAuthenticated, function(req, res, next) {
        var hostname = req.headers.host.split(":")[0];
        hostname = hostname.substring(0, hostname.indexOf('.'));
        if (hostname == 'admin') {
            kue.app(req, res, next);
        } else {
            next();
        }
    });

    // TODO: need a way to have a main application that serves itself infront of the admin portal
    app.get('*', isAuthenticated, function(req, res, next) {
        var hostname = req.headers.host.split(":")[0];
        hostname = hostname.substring(0, hostname.indexOf('.'));
        // TODO: admin portal should be able to add repos
        // TODO: admin portal should be able to add users
        // TODO: admin portal should record statics from all apps being run (geo, users, traffic, etc)
        // TODO: admin portal should show all of that data
        if (hostname == 'admin') {
            switch (req.url) {
                case '/logs/json':
                    res.send(GLOBAL.logs);
                    break;
                case '/process/json':
                    pm2.connect(true, function(err) {
                        pm2.list(function(err, list) {
                            pm2.disconnect();
                            res.send(list);
                        });
                    });
                    break;
                case '/':
                    res.render('admin');
                    break;
                default:
                    next();
                    break;
            }
        } else {
            if (GLOBAL.wildcards[hostname]) {
                proxy.web(req, res, {
                    target: 'http://127.0.0.1:' + wildcards[hostname]
                }, function(e) {
                    log.error('proxy:error', e.toString());
                    if (e) {
                        next();
                    }
                });
            } else {
                next();
            }
        }
    });

    app.use(function(req, res, next) {
        res.render('404');
    });

    app.listen(port, function() {
        log.info('node-distribute listening on http://localhost:' + port)
    });

}
