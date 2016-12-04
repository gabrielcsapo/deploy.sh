var request = require('supertest');
var path = require('path');
var assert = require('chai').assert;
var spawn = require('child_process').spawn;
var chance = require('chance')();
var random_ua = require('random-ua');

describe('static-app', function() {
    it('should add the necessary remote', function(done) {
        var user = require('../../operations/lib/user.js').get();
        var remote = 'http://' + user.username + ':' + user.password + '@localhost:7000/static-app.git';
        var git = spawn('git', ['remote', 'add', 'origin', remote], {
            cwd: path.resolve(__dirname, 'fixtures', 'static-app')
        });

        git.on('close', function() {
            setTimeout(function() {
                done();
            }, 1000);
        });
    });

    it('should be able to get test repo', function(done) {
        var git = spawn('git', ['push', 'origin', 'master'], {
            cwd: path.resolve(__dirname, 'fixtures', 'static-app')
        });

        git.on('close', function() {
            setTimeout(function() {
                done();
            }, 25000);
        });
    });

    for (var i = 0; i < 25; i++) {
        it('should be able to reach new app url', function(done) {
            request('http://localhost:1337')
                .get('/')
                .set('Host', 'static.example.com')
                .set('x-forwarded-for', chance.ip())
                .set('user-agent', random_ua.generate())
                .set('referrer', chance.domain())
                .expect('Content-Type', 'text/html; charset=UTF-8')
                .expect(function(res) {
                    assert.equal(res.headers['content-encoding'], 'gzip');
                })
                .expect(200, function(err) {
                    assert.isNull(err);
                    request('http://localhost:1337')
                        .get('/blog.html')
                        .set('Host', 'static.example.com')
                        .set('x-forwarded-for', chance.ip())
                        .set('user-agent', random_ua.generate())
                        .set('referrer', chance.domain())
                        .expect('Content-Type', 'text/html; charset=UTF-8')
                        .expect(function(res) {
                            assert.equal(res.headers['content-encoding'], 'gzip');
                        })
                        .expect(200, function(err) {
                            assert.isNull(err);
                            request('http://localhost:1337')
                                .get('/image.jpeg')
                                .set('Host', 'static.example.com')
                                .set('x-forwarded-for', chance.ip())
                                .set('user-agent', random_ua.generate())
                                .set('referrer', chance.domain())
                                .expect('Content-Type', 'image/jpeg')
                                .expect(200, function(err) {
                                    assert.isNull(err);
                                    done();
                                });
                        });
                });
        });
    }
});
