var path = require('path');
var spawn = require('child_process').spawn;
var fs = require('fs');
var rimraf = require('rimraf');
var request = require('supertest');
var assert = require('chai').assert;

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

    it('should make the user config directory', function(done) {
        var directory = path.resolve(__dirname, '..', 'config')
         if (!fs.existsSync(directory)){
             fs.mkdirSync(directory);
         }
         done();
    });

    it('should write the user config', function(done) {
        var config = {
            "username": "root",
            "password": "ac2eb48019c3fdc0f8d0d86d2319254ca1785045"
        };
        fs.writeFile(path.resolve(__dirname, '..', 'config/user.json'), JSON.stringify(config), function (err) {
          if (err) return console.log(err); // eslint-disable-line no-console
          done();
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
                "name": "static-app",
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
            },
            {
                "subdomain": "*",
                "name": "main-app",
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

    it('should spawn node-distribute', function(done) {
        distribute = spawn('npm', ['start'], {
            cwd: path.resolve(__dirname)
        });

        distribute.stdout.on('data', function(data) {
            logs.push(data.toString('utf8'));
            console.log(data.toString('utf8')); // eslint-disable-line no-console
            if (data.toString('utf8').indexOf('node-distribute listening on http://localhost:1337') > -1) {
                setTimeout(function() {
                  done();
                }, 1000);
            }
        });

        distribute.stderr.on('data', function(data) {
            logs.push(data.toString('utf8'));
            console.log(data.toString('utf8')); // eslint-disable-line no-console
        });
    });

    it('should get a 404 on unknown route', function(done) {
        request('http://localhost:1337')
            .get('/')
            .set('Host', 'example.com')
            .expect(404, function(err) {
                assert.isNull(err);
                done();
            });
    });

    it('should be able get process logs', function(done) {
        var user = require('../config/user.json');
        setTimeout(function() {
            request('http://localhost:1337')
                .get('/process/json')
                .auth(user.username, user.password)
                .set('Host', 'admin.example.com')
                .expect(200, function(err, res) {
                    assert.isObject(res.body);
                    assert.isNull(err);
                    done();
                });
        }, 2000);
    });

    require('./node-app');
    require('./static-app');
    require('./main-app');
});
