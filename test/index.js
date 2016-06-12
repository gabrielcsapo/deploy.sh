var request = require('supertest');
var path = require('path');
var assert = require('chai').assert;
var spawn = require('child_process').spawn;
var fs = require('fs');
var rimraf = require('rimraf');
var chance = require('chance')();

describe('node-distribute', function() {
    this.timeout(30000);

    var distribute;
    var logs = [];

    before(function(done) {
        try {
            fs.unlinkSync(path.resolve(__dirname, '..', 'db.json'));
        } catch (ex) {} // eslint-disable-line no-empty
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

    it('should get a 404 on unknown route', function(done) {
        request('http://localhost:1337')
            .get('/')
            .set('Host', 'what.example.com')
            .expect(404, function(err) {
                assert.isNull(err);
                done();
            });
    });

    it('should be able get process logs', function(done) {
        setTimeout(function() {
            request('http://localhost:1337')
                .get('/process/json')
                .set('Host', 'admin.example.com')
                .expect(200, function(err, res) {
                    assert.isArray(res.body);
                    assert.isNull(err);
                    done();
                });
        }, 2000);
    });

    it('should be remove remote origin', function(done) {
        var git = spawn('git', ['remote', 'remove', 'origin'], {
            cwd: path.resolve(__dirname, 'repo')
        });

        git.on('close', function() {
            setTimeout(function() {
                done();
            }, 1000);
        });
    });

    it('should add the necessary remote', function(done) {
        var user = require('../config/user.json');
        var remote = 'http://' + user.username + ':' + user.password + '@localhost:7000/test.git';
        var git = spawn('git', ['remote', 'add', 'origin', remote], {
            cwd: path.resolve(__dirname, 'repo')
        });

        git.on('close', function() {
            setTimeout(function() {
                done();
            }, 1000);
        });
    });

    it('should be able to get test repo', function(done) {
        var git = spawn('git', ['push', 'origin', 'master'], {
            cwd: path.resolve(__dirname, 'repo')
        });

        git.on('close', function() {
            setTimeout(function() {
                done();
            }, 25000);
        });
    });

    for (var i = 0; i < 10; i++) {
        it('should be able to reach new app url', function(done) {
            request('http://localhost:1337')
                .get('/distribute')
                .set('Host', 'test.example.com')
                .set('x-forwarded-for', chance.ip())
                .set('referrer', chance.domain())
                .expect(200, function(err) {
                    assert.isNull(err);
                    request('http://localhost:1337')
                        .get('/testing')
                        .set('Host', 'test.example.com')
                        .set('x-forwarded-for', chance.ip())
                        .set('referrer', chance.domain())
                        .expect(200, function(err) {
                            assert.isNull(err);
                            request('http://localhost:1337')
                                .get('/world')
                                .set('Host', 'test.example.com')
                                .set('x-forwarded-for', chance.ip())
                                .set('referrer', chance.domain())
                                .expect(200, function(err) {
                                    assert.isNull(err);
                                    done();
                                });
                        });
                });
        });
    }
});
