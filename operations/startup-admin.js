var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var basicAuth = require('basic-auth-connect');
var kue = require('kue');
var responseTime = require('response-time');
var moment = require('moment');
var http = require('http');
var geoip = require('geoip-lite');
var startApplication = require('./startup-application');
var path = require('path');
var child_process = require('child_process');
var server = require('http').Server(app);
var io = require('socket.io')(server);

// TODO: admin portal should be able to restart itself?
// TODO: admin portal should be able to add users
module.exports = function() {
    var user = require('./lib/user');
    var repos = require('./lib/repos');
    var log = require('./lib/log');
    var db = require('./lib/db');
    var processes = require('./lib/processes');
    var Server = require('./lib/server');

    process.env.VUE_ENV = 'server';

    var getHostname = function(req) {
        var hostname = req.headers.host.split(':')[0] ? req.headers.host.split(':')[0].substring(0, req.headers.host.split(':')[0].indexOf('.')) : req.subdomains;
        // We are looking for the main app, which we use * to denote no hostname
        hostname = hostname == '' ? '*' : hostname;
        return hostname;
    }

    var isAdminHost = function(req, res, next) {
        var hostname = getHostname(req);
        if (hostname == 'admin') {
            next();
        } else {
            res.status(404)
            res.sendFile(path.resolve(__dirname, 'views/404/index.html'));
        }
    }

    var isAuthenticated = function(req, res, next) {
        // Opens the door to having a server that is not authentication protected
        // This helps with local debugging
        if (user.get().username && user.get().password) {
            var hostname = getHostname(req);
            if (hostname == 'admin') {
                return basicAuth(user.get().username, user.get().password)(req, res, next);
            } else {
                next();
            }
        } else {
            next();
        }
    }

    var logs = child_process.fork(`${__dirname}/process-listen.js`);
    logs.on('message', function(m) {
      var name = m.name;
      var type = m.type;
      var data = m.data;
      io.sockets.emit(name + '-logs', log.application(name, data, type));
    });

    var usage = child_process.fork(`${__dirname}/process-usage.js`);
    usage.on('message', function(m) {
      if(m.monit) {
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

        db(m.name, 'cpu').push(cpu);
        db(m.name, 'memory').push(memory);
      }
    });

    kue.app.set('title', 'node-distribute');

    app.use(bodyParser.urlencoded({
        extended: false
    }));
    app.use(bodyParser.json());
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
                io.sockets.emit(repo.name + '-traffic', {
                    url: req.originalUrl,
                    traffic: [
                        [moment().format('x'), time, geo, referrer]
                    ]
                });
            }
        });
    }));

    app.get('*', function(req, res, next) {
        var hostname = getHostname(req);
        if (GLOBAL.wildcards[hostname]) {
            var connector = http.request({
              hostname: 'localhost',
              port: GLOBAL.wildcards[hostname],
              path: req.originalUrl,
              agent: false  // create a new agent just for this one request
            }, function(response) {
                res.set(response['headers']);
                response.pipe(res, { end: true });
            });
            req.pipe(connector, { end:true });
        } else {
            next();
        }
    });

    app.post('/api/process/:name/settings', isAdminHost, isAuthenticated, function(req, res) {
        var name = req.params.name;
        repos.update(req.body, function(error) {
            if (error) {
                res.status(500);
                res.send({ 'error': error });
            } else {
                delete GLOBAL.wildcards[name];
                startApplication(repos.get(name), path.resolve(__dirname, '..', 'app', name), repos.get(), function() {
                    log.info('app:restarted:', name);
                    res.status(200);
                    res.send({ 'success': 'app updated and restarted' });
                });
            }
        }, name);
    });
    app.get('/api/process/:name/json', isAdminHost, isAuthenticated, function(req, res) {
        var name = req.params.name;
        var process = processes.get(name);
        if (process.repo) {
            res.send(process);
        } else {
            res.status(500);
            res.send();
        }
    });
    app.get('/api/process/json', isAdminHost, isAuthenticated, function(req, res) {
        res.send(processes.get());
    });
    app.use('/api/process/:name/redeploy', isAdminHost, isAuthenticated, function(req, res) {
        var name = req.params.name;
        startApplication(repos.get(name), path.resolve(__dirname, '..', 'app', name), repos.get(), function() {
            log.info('app:restarted:', name);
            res.status(200);
            res.send({success: 'true'});
        });
    });
    app.use('/queue', isAdminHost, isAuthenticated, kue.app);
    app.use('/assets/', isAdminHost, isAuthenticated, express.static(path.resolve(__dirname, 'views', 'admin', 'dist')));
    app.use('/', isAdminHost, isAuthenticated, function(req, res) {
        res.sendFile(path.resolve(__dirname, 'views', 'admin', 'index.html'));
    });

    app.use(function(req, res) {
        res.status(404);
        res.sendFile(path.resolve(__dirname, 'views/404/index.html'));
    });

    server.listen(Server.get().admin.port, function() {
        log.info('node-distribute listening on http://localhost:' + Server.get().admin.port)
    });
}
