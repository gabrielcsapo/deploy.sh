var request = require('supertest');
var path = require('path');
var assert = require('chai').assert;
var spawn = require('child_process').spawn;
var chance = require('chance')();
var random_ua = require('random-ua');

describe('node-app', function() {
    it('should add the necessary remote', function(done) {
        var user = require('../../operations/lib/user.js').get();
        var remote = 'http://' + user.username + ':' + user.password + '@localhost:7000/node-app.git';
        var git = spawn('git', ['remote', 'add', 'origin', remote], {
            cwd: path.resolve(__dirname, 'fixtures', 'node-app')
        });

        git.on('close', function() {
            setTimeout(function() {
                done();
            }, 1000);
        });
    });

    it('should be able to get test repo', function(done) {
        var git = spawn('git', ['push', 'origin', 'master'], {
            cwd: path.resolve(__dirname, 'fixtures', 'node-app')
        });

        git.on('close', function() {
            setTimeout(function() {
                done();
            }, 25000);
        });
    });

    for (var i = 0; i < 25; i++) {
        it('should be able to reach new app url', function(done) {
            this.timeout(10000);
            request('http://localhost:1337')
                .get('/distribute')
                .set('Host', 'test.example.com')
                .set('x-forwarded-for', chance.ip())
                .set('user-agent', random_ua.generate())
                .set('referrer', chance.domain())
                .expect(200, function(err) {
                    assert.isNull(err);
                    request('http://localhost:1337')
                        .get('/testing')
                        .set('Host', 'test.example.com')
                        .set('x-forwarded-for', chance.ip())
                        .set('user-agent', random_ua.generate())
                        .set('referrer', chance.domain())
                        .expect(200, function(err) {
                            assert.isNull(err);
                            request('http://localhost:1337')
                                .get('/world')
                                .set('Host', 'test.example.com')
                                .set('x-forwarded-for', chance.ip())
                                .set('user-agent', random_ua.generate())
                                .set('referrer', chance.domain())
                                .expect(200, function(err) {
                                    assert.isNull(err);
                                    done();
                                });
                        });
                });
        });
    }
    it('should be able to POST', function(done) {
        this.timeout(10000);
        request('http://localhost:1337')
            .post('/post')
            .send({name: 'Bob'})
            .set('Host', 'test.example.com')
            .set('x-forwarded-for', chance.ip())
            .set('user-agent', random_ua.generate())
            .set('referrer', chance.domain())
            .expect(function(res) {
                assert.equal(res.text, 'hello Bob');
            })
            .expect(200, function(err) {
                assert.isNull(err);
                done();
            });
    });
    it('should be able to PUT', function(done) {
        request('http://localhost:1337')
            .put('/put/1')
            .send({name: 'Ned'})
            .set('Host', 'test.example.com')
            .set('x-forwarded-for', chance.ip())
            .set('user-agent', random_ua.generate())
            .set('referrer', chance.domain())
            .expect(function(res) {
                assert.equal(res.text, 'updated 1 with {"name":"Ned"}');
            })
            .expect(200, function(err) {
                assert.isNull(err);
                done();
            });
    });
    it('should be able to DELETE', function(done) {
        request('http://localhost:1337')
            .delete('/delete/1')
            .set('Host', 'test.example.com')
            .set('x-forwarded-for', chance.ip())
            .set('user-agent', random_ua.generate())
            .set('referrer', chance.domain())
            .expect(function(res) {
                assert.equal(res.text, 'deleted request with id 1');
            })
            .expect(200, function(err) {
                assert.isNull(err);
                done();
            });
    });
    it('should be able to upload a file', function(done){
      request('http://localhost:1337')
          .post('/profile')
          .field('name', 'Joe Schmoe')
          .attach('avatar', path.resolve(__dirname, './fixtures/images/avatar.png'))
          .set('Host', 'test.example.com')
          .set('x-forwarded-for', chance.ip())
          .set('user-agent', random_ua.generate())
          .set('referrer', chance.domain())
          .expect(function(res) {
              assert.isObject(res.body.body);
              assert.isString(res.body.body.name);
              assert.equal(res.body.body.name, 'Joe Schmoe');
              assert.isObject(res.body.file);
              assert.equal(res.body.file.fieldname, 'avatar');
              assert.equal(res.body.file.originalname, 'avatar.png');
              assert.equal(res.body.file.encoding, '7bit');
              assert.equal(res.body.file.mimetype, 'image/png');
              assert.isString(res.body.file.filename);
              assert.isString(res.body.file.path);
              assert.equal(res.body.file.size, 30735);
          })
          .expect(200, function(err) {
              assert.isNull(err);
              done();
          });
    });
});
