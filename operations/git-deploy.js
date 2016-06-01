var Git = require('nodegit');
var path = require('path');
var rimraf = require('rimraf');
var Promise = require('bluebird');
var kue = require('kue');
var spawn = require('cross-spawn');
var startApplication = require('./startup-application');
var log = require('./lib/log');
var db = require('./lib/db');
var pm2 = require('pm2');

var queue = kue.createQueue({
    redis: {
        port: 6379,
        host: '127.0.0.1',
        auth: '',
        options: {}
    },
    disableSearch: false
});

var repos = require('./lib/repos.js');

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
            return new Promise(function(resolve, reject) {
                rimraf(directory, function(err) {
                    if (err) {
                        reject(err);
                    }
                    Git.Clone(location, directory)
                        .then(function() {
                            resolve()
                        })
                        .catch(function(err) {
                            reject(err);
                        });
                });
            });
        })
        .then(function() {
            return new Promise(function(resolve, reject) {
                log.info('queue: running npm install :', name);
                job.log('queue: running npm install :', name);

                var cmd = path.resolve(require.resolve('npm'), '..', '..', 'bin', 'npm-cli.js');
                var args = ['install', '--ignore-scripts', '--production'];
                var npm = spawn(cmd, args, {
                    cwd: directory
                });
                npm.stdout.on('data', function(data) {
                    db(name, 'logs').push(data.toString());
                });
                npm.stderr.on('data', function(data) {
                    db(name, 'logs').push(data.toString());
                });
                npm.on('close', function(code) {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject();
                    }
                });
            });
        })
        .then(function() {
            job.progress(3, steps);
            log.info('queue:restarting the services:', name);
            job.log('queue:restarting the services:', name);
            startApplication(name, directory, repos.get(), function() {
                job.remove(function(err) {
                    if (err) {
                        log.error(err);
                    }
                    done();
                });
            });
        });
});

module.exports = function(location, name) {
    log.info('deploy:stop process', name);
    pm2.connect(true, function(err) {
        if (err) {
            log.error(err);
        }
        pm2.stop(name, function(err) {
            if (err) {
                log.error(err);
            }
            queue.create('install', {
                    location: location,
                    name: name,
                    directory: path.resolve(__dirname, '..', 'app', name)
                })
                .searchKeys(['title', 'hash'])
                .save();
        });
    });
}
