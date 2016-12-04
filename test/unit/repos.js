var assert = require('chai').assert;
var expect = require('chai').expect;

var path = require('path');
var fs = require('fs');

describe('repos', function() {

    it('should return a test repos object', function() {
      var Repos = require('../../operations/lib/repos');

      var repos = Repos.get();
      assert.isArray(repos);
    });

    it('should return repos that already exist', function() {
      var existingRepos = [
          {
              'subdomain': 'test',
              'name': 'node-app',
              'type': 'NODE',
              'anonRead': false
          },
          {
              'subdomain': 'static',
              'name': 'static-app',
              'type': 'STATIC',
              'anonRead': false
          },
          {
              'subdomain': 'static-different',
              'name': 'static-app-different-directory',
              'type': 'STATIC',
              'options': {
                  'directory': 'dist'
              },
              'anonRead': false
          },
          {
              'subdomain': '*',
              'name': 'main-app',
              'type': 'STATIC',
              'anonRead': false
          }
      ];

      var config = require('../../config/config.json');
      config.repos = existingRepos;
      fs.writeFileSync(path.resolve(__dirname, '../../config/config.json'), JSON.stringify(config));
      delete require.cache[require.resolve('../../operations/lib/repos')];
      delete require.cache[require.resolve('../../operations/lib/config')];
      var Repos = require('../../operations/lib/repos');

      var repos = Repos.get();
      assert.isArray(repos);
      // The default repo is the admin portal
      assert.equal(repos.length, existingRepos.length + 1);
      repos.forEach(function(repo) {
        expect(repo.subdomain).is.not.empty;
        assert.isString(repo.subdomain);
        expect(repo.name).is.not.empty;
        assert.isString(repo.name);
        expect(repo.type).is.not.empty;
        assert.isString(repo.type);
        assert.isBoolean(repo.anonRead);
        expect(repo.users).is.not.empty;
        assert.isArray(repo.users);
      });
    });

    it('should update the repo object with the name node-app', function(done) {
      var expectedRepo = {
          'subdomain': 'what',
          'name': 'node-app',
          'type': 'STATIC',
          'anonRead': false
      };

      var Repos = require('../../operations/lib/repos');
      Repos.update(expectedRepo, function(err, repo) {
        assert.isString(repo.subdomain);
        assert.equal(expectedRepo.subdomain, repo.subdomain);
        assert.isString(repo.name);
        assert.equal(expectedRepo.name, repo.name);
        assert.isString(repo.type);
        assert.equal(expectedRepo.type, repo.type);
        assert.isBoolean(repo.anonRead);
        assert.equal(expectedRepo.anonRead, repo.anonRead);
        done();
      }, 'node-app');
    });

    it('should update the entire config', function(done) {
      var expectedRepo = [{
          'subdomain': 'testing',
          'name': 'node-app',
          'type': 'NODE',
          'anonRead': false
      },
      {
          'subdomain': 'test',
          'name': 'static-app',
          'type': 'STATIC',
          'anonRead': true
      }];

      var Repos = require('../../operations/lib/repos');
      Repos.update(expectedRepo, function(err, repos) {
        assert.deepEqual(expectedRepo, repos);
        done();
      });
    });

    it('should get a repo by the hostname', function() {
      var existingRepos = [
          {
              'subdomain': 'test',
              'name': 'node-app',
              'type': 'NODE',
              'anonRead': false
          },
          {
              'subdomain': 'static',
              'name': 'static-app',
              'type': 'STATIC',
              'anonRead': false
          }
      ];

      var config = require('../../config/config.json');
      config.repos = existingRepos;
      fs.writeFileSync(path.resolve(__dirname, '../../config/config.json'), JSON.stringify(config));
      delete require.cache[require.resolve('../../operations/lib/repos')];
      delete require.cache[require.resolve('../../operations/lib/config')];
      var Repos = require('../../operations/lib/repos');

      var repo = Repos.getByHostname('test');
      assert.equal(repo.subdomain, existingRepos[0].subdomain);
      assert.equal(repo.name, existingRepos[0].name);
      assert.equal(repo.type, existingRepos[0].type);
      assert.equal(repo.anonRead, existingRepos[0].anonRead);
    });

    it('should return a specific repo', function() {
      var Repos = require('../../operations/lib/repos');
      var repo = Repos.get('static-app');
      assert.isObject(repo);
      assert.isString(repo.subdomain);
      assert.isString(repo.name);
      assert.isString(repo.type);
      assert.isBoolean(repo.anonRead);
      assert.isArray(repo.users);
    });
});
