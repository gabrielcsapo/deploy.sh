var log = require('./lib/log');
var portfinder = require('portfinder');
var pm2 = require('pm2');
var fs = require('fs');

module.exports = function(name, directory, repos, callback) {
    fs.exists(directory, function(exists) {
        if (exists) {
            portfinder.getPort(function(err, port) {
                pm2.connect(true, function(err) {
                    if (err) {
                        log.error('queue:restart', err.toString());
                        process.exit(2);
                    }
                    // TODO: need to be able customized scripts
                    pm2.start({
                        name: name,
                        cwd: directory,
                        script: 'index.js',
                        env: {
                            PORT: port
                        }
                    }, function(err, apps) {
                        pm2.disconnect();
                        if (err) {
                            log.error('queue:pm2:start', err);
                        }
                        // Go through repos and check for subdomin and register it with wildcard routes
                        repos.forEach(function(repo) {
                            if (repo.name == name) {
                                if (repo.subdomain) {
                                    GLOBAL.wildcards[repo.subdomain] = port;
                                }
                            }
                        });
                        callback();
                    });
                });
            });
        } else {
            callback();
        }
    });
}
