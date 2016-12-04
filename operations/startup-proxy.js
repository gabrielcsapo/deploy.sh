/**
 * Starts the proxy server
 * @module startup-proxy
 */

var express = require('express');
var app = express();
var basicAuth = require('basic-auth-connect');
var path = require('path');
var request = require('request');
var responseTime = require('response-time');
var moment = require('moment');
var geoip = require('geoip-lite');
var child_process = require('child_process');
var bodyParser = require('body-parser');
var startApplication = require('./startup-application');
var uaParser = require('ua-parser-js');
var server = require('http').Server(app);
var io = require('socket.io')(server);

module.exports = function() {
    var User = require('./lib/user');
    var Repos = require('./lib/repos');
    var Log = require('./lib/log');
    var db = require('./lib/db');
    var Processes = require('./lib/processes');
    var Server = require('./lib/server');

    var getHostname = function(req) {
        var hostname = req.headers.host.split(':')[0] ? req.headers.host.split(':')[0].substring(0, req.headers.host.split(':')[0].indexOf('.')) : req.subdomains;
        // We are looking for the main app, which we use * to denote no hostname
        hostname = hostname == '' ? '*' : hostname;
        return hostname;
    };

    var logs = child_process.fork(`${__dirname}/process-listen.js`);
    logs.on('message', function(m) {
        var name = m.name;
        var type = m.type;
        var data = m.data;
        var formattedLog = Log.application(name, data, type);
        io.sockets.emit(name + '-logs', formattedLog);
    });

    var usage = child_process.fork(`${__dirname}/process-usage.js`);
    usage.on('message', function(m) {
        if (m.monit) {
            var cpu = [moment().format('x'), m.monit.cpu];
            var memory = [moment().format('x'), m.monit.memory];

            io.sockets.emit(m.name + '-memory', {
                cpu: cpu,
                memory: memory
            });

            io.sockets.emit(m.name + '-uptime', {
                created_at: m.created_at,
                status: m.status,
                instances: m.instances
            });
        }
    });

    app.use(responseTime(function(req, res, time) {
        var ip = req.query.ip ||
            req.headers['x-forwarded-for'] ||
            req.headers['X-Forwarded-For'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress;
        var geo = geoip.lookup(ip);
        var referrer = req.get('Referrer');
        var hostname = getHostname(req);
        Repos.get().forEach(function(repo) {
            if (repo.subdomain == hostname) {
                var trafficInstance = {
                  'date': moment().format('x'),
                  'time': time,
                  'geo': geo,
                  'referrer': referrer,
                  'ua': uaParser(req.headers['user-agent'])
                };
                if (db(repo.name, 'traffic').find({
                        url: req._parsedUrl.pathname
                    })) {
                    db(repo.name, 'traffic').find({
                        url: req._parsedUrl.pathname
                    }).traffic.push(trafficInstance);
                } else {
                    db(repo.name, 'traffic').push({
                        url: req._parsedUrl.pathname,
                        traffic: [trafficInstance]
                    });
                }
                io.sockets.emit(repo.name + '-traffic', {
                    url: req.originalUrl,
                    traffic: [trafficInstance]
                });
            }
        });
    }));

    /** this is going to be the API that can be served to the admin application */

    var isAuthenticated = function(req, res, next) {
        // Opens the door to having a server that is not authentication protected
        // This helps with local debugging
        if (User.get().username && User.get().password) {
            return basicAuth(User.get().username, User.get().password)(req, res, next);
        } else {
            next();
        }
    };

    var isAdminHost = function(req, res, next) {
        var hostname = getHostname(req);
        if (hostname == 'admin') {
            next();
        } else {
            res.status(404);
            res.sendFile(path.resolve(__dirname, 'views/404/index.html'));
        }
    };

    app.post('/api/process/:name/settings', isAdminHost, isAuthenticated, bodyParser.json(), function(req, res) {
        var name = req.params.name;
        Repos.update(req.body, function(error) {
            if (error) {
                res.status(500);
                res.send({
                    'error': error
                });
            } else {
                delete GLOBAL.wildcards[name];
                startApplication(Repos.get(name), path.resolve(__dirname, '..', 'app', name), Repos.get(), function() {
                    Log.info('app:restarted:', name);
                    res.status(200);
                    res.send({
                        'success': 'app updated and restarted'
                    });
                });
            }
        }, name);
    });
    app.get('/api/process/:name/json', isAdminHost, isAuthenticated, function(req, res) {
        var name = req.params.name;
        var process = Processes.get(name);
        if (process.repo) {
            res.send(process);
        } else {
            res.status(500);
            res.send();
        }
    });
    app.get('/api/process/json', isAdminHost, isAuthenticated, function(req, res) {
        res.send(Processes.get());
    });
    app.use('/api/process/:name/redeploy', isAdminHost, isAuthenticated, function(req, res) {
        var name = req.params.name;
        startApplication(Repos.get(name), function() {
            Log.info('app:restarted:', name);
            res.status(200);
            res.send({
                success: 'true'
            });
        });
    });

    app.all('*', function(req, res, next) {
        var hostname = getHostname(req);
        var port = GLOBAL.wildcards[hostname];
        var url = `http://localhost:${port}${req.originalUrl}`;
        
        if (port) {
            try {
              req.pipe(request(url)).pipe(res);
            } catch(ex) {
              next();
            }
        } else {
            next();
        }
    });

    app.use(function(req, res) {
        res.status(404);
        res.sendFile(path.resolve(__dirname, 'views/404/index.html'));
    });

    server.listen(Server.get().proxy.port, function() {
        Log.info('proxy listening on http://localhost:' + Server.get().proxy.port);
    });
};
