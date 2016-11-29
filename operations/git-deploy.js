/**
 * deploys application (NODE or STATIC)
 * @module git-deploy
 */

var path = require('path');
var fs = require('fs');
var rimraf = require('rimraf');
var Promise = require('bluebird');
var kue = require('kue');
var spawn = require('child_process').spawn;
var startApplication = require('./startup-application');
var log = require('./lib/log');
var db = require('./lib/db');
var pm2 = require('pm2');
var _ = require('underscore');

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
    var repo = job.data.repo;
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

                    var clone = spawn('git', ['clone', location, directory]);

                    clone.on('close', function(code) {
                      if(code == 0) {
                          resolve();
                      } else {
                          reject();
                      }
                    });
                });
            });
        })
        .then(function() {
            return new Promise(function(resolve, reject) {
                if(repo.type == 'NODE') {
                    // Verify that a package.json exists
                    if(fs.existsSync(path.resolve(directory, 'package.json'))) {
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
                    } else {
                        reject();
                    }
                } else {
                    resolve();
                }
            });
        })
        .then(function() {
            job.progress(3, steps);
            log.info('queue:restarting the services:', name);
            job.log('queue:restarting the services:', name);
            startApplication(repo, directory, repos.get(), function() {
                job.remove(function(err) {
                    if (err) {
                        log.error(err);
                    }
                    done();
                });
            });
        });
});

/**
 * deploys application (NODE or STATIC)
 * @param  {string} location absolute path to the folder that application will be deployed to
 * @param  {Repo} repo     a Repo object
 * @return {Promise}
 */
module.exports = function(location, repo) {
    log.info('deploy:stop process', repo.name);
    pm2.connect(true, function(err) {
        if (err) {
            log.error(err);
        }
        pm2.stop(repo.name, function(err) {
            if (err) {
                log.error(err);
            }
            queue.create('install', {
                    location: location,
                    name: repo.name,
                    repo: _.omit(repo, 'git_events'),
                    directory: path.resolve(__dirname, '..', 'app', repo.name)
                })
                .searchKeys(['title', 'hash'])
                .save(function(err){
                   if(err) {
                       log.error(err);
                   }
                });
        });
    });
};
