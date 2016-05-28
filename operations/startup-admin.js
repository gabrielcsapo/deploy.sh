var express = require('express');
var app = express();
var basicAuth = require('basic-auth-connect');
var kue = require('kue');
var Promise = require('bluebird');
var spawn = require('cross-spawn-async');

var GitDeploy = require('./git-deploy.js');
var pm2 = require('pm2');

module.exports = function(log, user, repos) {
    var port = process.env.PORT || 1337;

    // TODO: cleanup 🖕
    var queue = kue.createQueue({
        redis: {
            port: 6379,
            host: '127.0.0.1',
            auth: '',
            options: {}
        },
        disableSearch: false
    });

    pm2.connect(true, function(err) {
        if (err) {
            console.log(err);
            process.exit(2);
        }

        // TODO: need to implement subdomains and wildcard routing to proxy to apps on the server
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

        // TODO: cleanup 🖕
        var steps = 3;
        queue.process('install', 1, function(job, done) {
            job.progress(0, steps);
            var location = job.data.location;
            var directory = job.data.directory;
            var name = job.data.name;
            return Promise.resolve()
                .then(function() {
                    log.info('queue:deploying the app:', name);
                    job.log('queue:deploying the app:', name);
                    job.progress(1, steps);
                    return GitDeploy(location, name, directory);
                })
                .then(function() {
                    return new Promise(function(resolve, reject) {
                        log.info('queue: running npm install :', name);
                        job.log('queue: running npm install :', name);
                        console.log(directory);
                        var cmd = path.resolve(require.resolve('npm'), '..', '..', 'bin', 'npm-cli.js');
                        var args = ['install', '--ignore-scripts', '--production'];
                        var npm = spawn(cmd, args, {
                            cwd: directory
                        });
                        npm.stdout.on('data', function(data) {
                            console.log(data.toString())
                        });
                        npm.stderr.on('data', function(data) {
                            console.log(data.toString())
                        });
                        npm.on('close', function(code) {
                            resolve();
                        });
                    });
                })
                .then(function() {
                    job.progress(3, steps);
                    log.info('queue:restarting the services:', name);
                    job.log('queue:restarting the services:', name);

                    // TODO: figure out how to run start command
                    // TODO: need to record the app id to kill it in case of redeploy
                    // TODO: need to pipe all logs to admin portal
                    // TODO: need to pass randomized port to stop port collisions
                    pm2.start({
                        name: name,
                        cwd: directory,
                        script: 'index.js',
                    }, function(err, apps) {
                        pm2.disconnect();
                        console.log(err);
                        console.dir(apps);
                        done();
                    });
                })
        });

    });

    deploy = function(location, name) {
        log.info('deploy:stop process', name);
        pm2.connect(true, function(err) {
            pm2.stop(name, function(err){
                var install = queue.create('install', {
                        location: location,
                        name: name,
                        directory: path.resolve(__dirname, '..', 'app', name)
                    })
                    .searchKeys(['title', 'hash'])
                    .save();
            });
        });
    };

    return {
        deploy: deploy
    };
}
