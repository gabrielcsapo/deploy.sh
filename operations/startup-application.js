var log = require('./lib/log');
var portfinder = require('portfinder');
var pm2 = require('pm2');
var fs = require('fs');
var path = require('path');

module.exports = function(repo, directory, repos, callback) {
    fs.exists(directory, function(exists) {
        if (exists) {
            portfinder.getPort(function(err, port) {
                if (err) {
                    log.error('port:finder', err.toString());
                    process.exit(2);
                }
                pm2.connect(true, function(err) {
                    if (err) {
                        log.error('pm2:error', err.toString());
                        callback(err);
                    }
                    pm2.stop(repo.name, function(err) {
                        if (err) {
                            log.application(repo.name, 'application:stop');
                            log.error('application:stop', err.toString());
                        }
                        // TODO: need to be able customized scripts
                        if (repo.type == 'NODE') {
                            if (fs.existsSync(path.resolve(directory, 'package.json'))) {
                                pm2.start({
                                    name: repo.name,
                                    cwd: directory,
                                    script: 'index.js',
                                    env: {
                                        PORT: port
                                    }
                                }, function(err) {
                                    pm2.disconnect();
                                    if (err) {
                                        log.error('queue:pm2:start', err);
                                    }
                                    log.application(repo.name, 'application:started');
                                    // Go through repos and check for subdomin and register it with wildcard routes
                                    repos.forEach(function(_repo) {
                                        if (_repo.name == repo.name) {
                                            if (repo.subdomain) {
                                                GLOBAL.wildcards[repo.subdomain] = port;
                                            }
                                        }
                                    });
                                    callback();
                                });
                            }
                        } else {
                            // Static application should start in a cluster
                            if (repo.options && repo.options.directory) {
                                directory = path.resolve(directory, repo.options.directory);
                            }
                            pm2.start({
                                name: repo.name,
                                cwd: __dirname,
                                exec_mode: 'cluster',
                                instances: 4,
                                script: 'startup-application-static.js',
                                env: {
                                    DIRECTORY: directory,
                                    PORT: port
                                }
                            }, function(err) {
                                pm2.disconnect();
                                if (err) {
                                    log.error('queue:pm2:start', err);
                                }
                                log.application(repo.name, 'application:started');
                                // Go through repos and check for subdomin and register it with wildcard routes
                                repos.forEach(function(_repo) {
                                    if (_repo.name == repo.name) {
                                        if (repo.subdomain) {
                                            GLOBAL.wildcards[repo.subdomain] = port;
                                        }
                                    }
                                });
                                callback();
                            });
                        }
                    });
                });
            });
        } else {
            callback();
        }
    });
}
