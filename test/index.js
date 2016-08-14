var path = require('path');
var spawn = require('child_process').spawn;
var fs = require('fs');
var rimraf = require('rimraf');
var terminate = require('terminate');

describe('node-distribute', function() {
    this.timeout(30000);

    var distribute;
    var logs = [];

    before(function(done) {
        try {
            fs.unlinkSync(path.resolve(__dirname, '..', 'db.json'));
        } catch (ex) {} // eslint-disable-line no-empty
        rimraf(path.resolve(__dirname, '..', 'config'), function() {});
        rimraf(path.resolve(__dirname, '..', 'repos'), function() {});
        rimraf(path.resolve(__dirname, '..', 'app'), function() {});
        setTimeout(function() {
            done();
        }, 2000)
    });

    after(function() {
        distribute.stdin.pause();
        distribute.kill();
    });

    it('should spawn node-distribute', function(done) {
        distribute = spawn('npm', ['start'], {
            cwd: path.resolve(__dirname)
        });

        distribute.stdout.on('data', function(data) {
            logs.push(data.toString('utf8'));
            console.log(data.toString('utf8')); // eslint-disable-line no-console
            if (data.toString('utf8').indexOf('Server listening on  7000') > -1) {
                done();
            }
        });

        distribute.stderr.on('data', function(data) {
            logs.push(data.toString('utf8'));
            console.log(data.toString('utf8')); // eslint-disable-line no-console
        });
    });

    it('should write the correct test config to config/repos.json', function(done) {
        var config = [
            {
                "subdomain": "test",
                "name": "node-app",
                "type": "NODE",
                "anonRead": false,
                "users": [
                    {
                        "user": {
                            "username": "root",
                            "password": require('../config/user.json').password
                        },
                        "permissions": [
                            "R",
                            "W"
                        ]
                    }
                ]
            },
            {
                "subdomain": "static",
                "name": "static-pages",
                "type": "STATIC",
                "anonRead": false,
                "users": [
                    {
                        "user": {
                            "username": "root",
                            "password": require('../config/user.json').password
                        },
                        "permissions": [
                            "R",
                            "W"
                        ]
                    }
                ]
            }
        ]
        fs.writeFile(path.resolve(__dirname, '..', 'config/repos.json'), JSON.stringify(config), function (err) {
          if (err) return console.log(err); // eslint-disable-line no-console
          done();
        });
    });

    it('should restart the child process', function(done) {
        // Waiting for the socket to be open to start the app again
        terminate(distribute.pid, function() {
            distribute = spawn('npm', ['start'], {
                cwd: path.resolve(__dirname)
            });

            distribute.stdout.on('data', function(data) {
                logs.push(data.toString('utf8'));
                console.log(data.toString('utf8')); // eslint-disable-line no-console
                if (data.toString('utf8').indexOf('Server listening on  7000') > -1) {
                    done();
                }
            });

            distribute.stderr.on('data', function(data) {
                logs.push(data.toString('utf8'));
                console.log(data.toString('utf8')); // eslint-disable-line no-console
            });
        });
    });

    require('./node-app');
    require('./static-pages');

});
