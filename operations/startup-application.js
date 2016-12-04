/**
 * Module that starts (NODE / STATIC / SCRIPT) applications
 * @module startup-application
 */

var portfinder = require('portfinder');
var pm2 = require('pm2');
var fs = require('fs');
var path = require('path');

module.exports = function(repo, callback) {
    var directory = path.resolve(__dirname, '..', 'app', repo.name);
    portfinder.getPort(function(err, port) {
        if (err) {
            return callback(err);
        }
        pm2.connect(true, function(err) {
            if (err) {
                return callback(err);
            }
            pm2.stop(repo.name, function() {
                // TODO: need to be able customized scripts
                if (repo.type === 'NODE') {
                    if (fs.existsSync(directory) && fs.existsSync(path.resolve(directory, 'package.json'))) {
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
                                return callback(err);
                            }
                            callback();
                        });
                        // sets the port for the application
                        GLOBAL.wildcards[repo.subdomain] = port;
                    } else {
                      callback();
                    }
                } else if(repo.type === 'SCRIPT') {
                    if(fs.existsSync(path.resolve(repo.options.executeDirectory)) && path.resolve(repo.options.executeDirectory, repo.options.script)) {
                      pm2.start({
                          name: repo.name,
                          cwd: __dirname,
                          script: repo.options.script,
                          env: {
                              PORT: port
                          }
                      }, function(err) {
                          pm2.disconnect();
                          if (err) {
                              return callback(err);
                          }
                          callback();
                      });
                      // sets the port for the application
                      GLOBAL.wildcards[repo.subdomain] = port;
                    } else {
                      callback('script does not exist');
                    }
                } else {
                    // Static application should start in a cluster
                    var staticPath = directory;
                    if (repo.options && repo.options.directory) {
                      staticPath = path.resolve(directory, repo.options.directory);
                    }

                    if (fs.existsSync(staticPath)) {
                      pm2.start({
                          name: repo.name,
                          cwd: __dirname,
                          exec_mode: 'cluster',
                          instances: 4,
                          script: 'startup-application-static.js',
                          env: {
                              DIRECTORY: staticPath,
                              PORT: port
                          }
                      }, function(err) {
                          pm2.disconnect();
                          if (err) {
                              return callback(err);
                          }
                          callback();
                      });
                      // sets the port for the application
                      GLOBAL.wildcards[repo.subdomain] = port;
                    } else {
                      callback();
                    }
                }
            });
        });
    });
};
