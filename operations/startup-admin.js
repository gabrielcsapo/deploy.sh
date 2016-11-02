var express = require('express');
var bodyParser = require('body-parser');
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
var _ = require('underscore');

var log = require('./lib/log');
var db = require('./lib/db');

// TODO: cleanup
// TODO: admin portal should be able to restart itself?
// TODO: admin portal should be able to add users
module.exports = function() {
    var user = require('./lib/user');
    var repos = require('./lib/repos');
    var port = process.env.PORT || 1337;
    var processes = {};

    var getProcessData = function(callback) {
        pm2.connect(true, function(err) {
            if (err) {
                throw err;
            }
            pm2.list(function(err, list) {
                if (err) {
                    throw err;
                }
                list.forEach(function(process) {
                    if (!processes[process.name]) {
                        processes[process.name] = {
                            memory: [],
                            repo: [],
                            logs: [],
                            traffic: []
                        };
                    }

                    processes[process.name].memory.push([moment().format('x'), process.monit.memory]);
                    processes[process.name].repo = repos.get(process.name);
                    processes[process.name].logs = db(process.name, 'logs').value();
                    processes[process.name].traffic = db(process.name, 'traffic').value();
                    processes[process.name].memory = db(process.name, 'memory').value();
                });
                pm2.disconnect();
                if(typeof callback === 'function') {
                    callback();
                }
            });
        });
    }

    var isAdminHost = function(req, res, next) {
        var hostname = req.headers.host.split(":")[0];
        hostname = hostname.substring(0, hostname.indexOf('.'));
        if (hostname == 'admin') {
            next();
        } else {
            res.status(404)
            res.render('404');
        }
    }

    var isAuthenticated = function(req, res, next) {
        // Opens the door to having a server that is not authentication protected
        // This helps with local debugging
        if (user.get().username && user.get().password) {
            var hostname = req.headers.host.split(":")[0];
            hostname = hostname.substring(0, hostname.indexOf('.'));
            if (hostname == 'admin') {
                return basicAuth(user.get().username, user.get().password)(req, res, next);
            } else {
                next();
            }
        } else {
            next();
        }
    }

    pm2.connect(true, function(err) {
        if (err) {
            throw err;
        }
        pm2.launchBus(function(err, bus) {
            bus.on('log:out', function(data) {
                db(data.process.name, 'logs').push(moment().format() + ': ' + data.data)
            });
        });
    });

    kue.app.set('title', 'node-distribute');

    app.set('views', './operations/views')
    app.set('view engine', 'pug');
    app.use(bodyParser.urlencoded({
        extended: false
    }));
    app.use(bodyParser.json());
    app.use(responseTime(function(req, res, time) {
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
        // check for main application
        hostname = (hostname == "" ? "*" : hostname);
        repos.get().forEach(function(repo) {
            if (repo.subdomain == hostname) {
                if (db(repo.name, 'traffic').find({
                        url: req.originalUrl
                    })) {
                    db(repo.name, 'traffic').find({
                        url: req.originalUrl
                    }).traffic.push([moment().format('x'), time, geo, referrer])
                } else {
                    db(repo.name, 'traffic').push({
                        url: req.originalUrl,
                        traffic: [
                            [moment().format('x'), time, geo, referrer]
                        ]
                    });
                }
            }
        });
    }));
    app.get('*', function(req, res, next) {
        var hostname = req.headers.host.split(":")[0];
        hostname = hostname.substring(0, hostname.indexOf('.'));

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
    });
    app.use('/queue', isAdminHost, isAuthenticated, function(req, res, next) {
        var hostname = req.headers.host.split(":")[0];
        hostname = hostname.substring(0, hostname.indexOf('.'));
        if (hostname == 'admin') {
            kue.app(req, res, next);
        } else {
            next();
        }
    });
    app.use('/application/:name', isAdminHost, isAuthenticated, function(req, res, next) {
        var hostname = req.headers.host.split(":")[0];
        hostname = hostname.substring(0, hostname.indexOf('.'));
        if (hostname == 'admin') {
            res.render('admin/application-view');
        } else {
            next();
        }
    });
    app.use('/process/:name/json', isAdminHost, isAuthenticated, function(req, res, next) {
        var name = req.params.name;
        if (processes[name]) {
            var process = processes[name];
            process.name = name;
            res.send(process);
        } else {
            next();
        }
    });
    app.get('/process/json', isAdminHost, isAuthenticated, function(req, res) {
        res.send(processes);
    });
    app.use('/', isAdminHost, isAuthenticated, function(req, res, next) {
        if (req.originalUrl.indexOf('settings') > -1) {
            next();
        } else {
            getProcessData(function(){
                res.render('admin/application-list', {
                    processes: processes,
                    formatSize: function(bytes) {
                        if (bytes == 0) return '0 B';
                        var sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
                        var i = Math.floor(Math.log(bytes) / Math.log(1000));
                        return parseFloat((bytes / Math.pow(1000, i)).toFixed(3)) + ' ' + sizes[i];
                    }
                });
            });
        }
    });
    app.get('/settings', isAdminHost, isAuthenticated, function(req, res) {
        var config = repos.get();
        config = config.map(function(c) {
            return _.omit(c, 'git_events', 'event', 'path', 'last_commit');
        });
        res.render('admin/admin-view', {
            config: config
        });
    });
    app.post('/settings', isAdminHost, isAuthenticated, function(req, res) {
        repos.update(req.body, function(err) {
            if (err) {
                res.status(500);
                res.send(err);
            } else {
                res.status(200);
                res.send();
            }
        });
    });
    app.use('/application/:name/redeploy', isAdminHost, isAuthenticated, function(req, res) {
        var name = req.params.name;
        startApplication(name, path.resolve(__dirname, '..', 'app', name), repos.get(), function() {
            log.info('app:restarted:', name);
            res.status(200);
        });
    });

    app.use(function(req, res) {
        res.status(404);
        res.render('404');
    });

    app.listen(port, function() {
        log.info('node-distribute listening on http://localhost:' + port)
            // Polls PM2 for info every 60 seconds
        setInterval(function() {
            getProcessData();
        }, 60000);
        getProcessData();
    });
}
