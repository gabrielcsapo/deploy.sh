var express = require('express');
var app = express();
var basicAuth = require('basic-auth-connect');
var kue = require('kue');
var Promise = require('bluebird');

var GitDeploy = require('./git-deploy.js');

module.exports = function(log, user, repos) {
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
    kue.app.set('title', 'node-distribute');
    app.use('/admin/queue', kue.app);

    app.listen(port, function() {
        log.info('node-distribute listening on http://localhost:' + port)
    });

    // TODO: cleanup
    var queue = kue.createQueue({
        redis: {
            port: 6379,
            host: '127.0.0.1',
            auth: '',
            options: {}
        },
        disableSearch: false
    });

    // TODO: cleanup
    var steps = 2;
    queue.process('install', 1, function(job, done) {
        job.progress(0, steps);
        var location = job.data.location;
        var name = job.data.name;
        return Promise.resolve()
            .then(function() {
                log.info('queue:deploying the app');
                job.log('queue:deploying the app');
                job.progress(1, steps);
                GitDeploy(location, name);
            }).then(function() {
                log.info('queue:restarting the services');
                job.log('queue:restarting the services');
                job.progress(2, steps);
                done();
            });
    });

    deploy = function(location, name) {
        // TODO: implement starting the app
        // TODO: implement running npm install in the app directory
        // TODO: deploy should clone the repo to app and do a npm install
        // TODO: once the deploy is done start node process using npm start (PM2?)
        var install = queue.create('install', {
            location: location,
            name: name
        })
        .searchKeys(['title', 'hash'])
        .save();
    };

    return {
        deploy: deploy
    };
}
