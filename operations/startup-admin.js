var express = require('express');
var app = express();
var basicAuth = require('basic-auth-connect');
var kue = require('kue');
var responseTime = require('response-time');
var moment = require('moment');
var httpProxy = require('http-proxy');
var proxy = httpProxy.createProxyServer({});
var pm2 = require('pm2');
var geoip = require('geoip-lite');
var startApplication = require('./startup-application');
var path = require('path');

var log = require('./lib/log');
var db = require('./lib/db');

// TODO: cleanup 🖕
module.exports = function() {
    require('./startup-applications')();

    var user = require('./lib/user');
    var repos = require('./lib/repos');

    var port = process.env.PORT || 1337;

    pm2.launchBus(function(err, bus) {
        bus.on('log:out', function(data) {
            db(data.process.name, 'logs').push(moment().format() + ': ' + data.data)
        });
    });

    app.set('views', './operations/views')
    app.set('view engine', 'pug');
    kue.app.set('title', 'node-distribute');

    app.use(responseTime(function (req, res, time) {
        var ip = req.query.ip ||
                 req.headers['x-forwarded-for'] ||
                 req.headers["X-Forwarded-For"] ||
                 req.connection.remoteAddress ||
                 req.socket.remoteAddress ||
                 req.connection.socket.remoteAddress;
        var geo = geoip.lookup(ip);
        var referrer = req.get('Referrer');
        var hostname = req.headers.host.split(":")[0];
        hostname = hostname.substring(0, hostname.indexOf('.'));
        repos.get().forEach(function(repo) {
            if(repo.subdomain == hostname) {
                if(db(repo.name, 'traffic').find({ url: req.originalUrl})) {
                    db(repo.name, 'traffic').find({ url: req.originalUrl}).traffic.push([moment().format('x'), time, geo, referrer])
                } else {
                    db(repo.name, 'traffic').push({url: req.originalUrl, traffic: [[moment().format('x'), time, geo, referrer]]});
                }
            }
        });
    }));

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
        // TODO: admin portal should be able to restart itself?
        // TODO: admin portal should be able to add repos
        // TODO: admin portal should be able to add users
        if (hostname == 'admin') {
            if(req.url.indexOf('redeploy') > -1) {
                var name = req.url.replace('/redeploy/', '');
                startApplication(name, path.resolve(__dirname, '..', 'app', name), repos.get(), function() {
                    log.info('app:restarted:', name);
                });
            } else {
                switch (req.url) {
                    case '/process/json':
                        pm2.connect(true, function(err) {
                            if (err) {
                                throw err;
                            }
                            pm2.list(function(err, list) {
                                if (err) {
                                    throw err;
                                }
                                list.forEach(function(process) {
                                    // TODO: should probably move this to a better location
                                    db(process.name, 'memory').push([moment().format('x'), process.monit.memory]);

                                    process.repo = repos.get(process.name);
                                    process.logs = db(process.name, 'logs').value();
                                    process.traffic = db(process.name, 'traffic').value();
                                    process.memory = db(process.name, 'memory').value();
                                });
                                pm2.disconnect();
                                res.send(list);
                            });
                        });
                        break;
                    case '/':
                        res.render('admin');
                        break;
                    default:
                        res.render('admin');
                        break;
                }
            }
        } else {
            // We are looking for the main app, which we use * to denote no hostname
            hostname = hostname === '' ? '*' : hostname;
            if (GLOBAL.wildcards[hostname]) {
                proxy.web(req, res, {
                    target: 'http://127.0.0.1:' + GLOBAL.wildcards[hostname]
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

    app.use(function(req, res) {
        res.status(404);
        res.render('404');
    });

    app.listen(port, function() {
        log.info('node-distribute listening on http://localhost:' + port)
    });

}
