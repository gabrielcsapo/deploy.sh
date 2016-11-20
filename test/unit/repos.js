var assert = require('chai').assert;

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
      assert.equal(repos.length, existingRepos.length);
      repos.forEach(function(repo, i) {
        assert.isString(repo.subdomain);
        assert.equal(existingRepos[i].subdomain, repo.subdomain);
        assert.isString(repo.name);
        assert.equal(existingRepos[i].name, repo.name);
        assert.isString(repo.type);
        assert.equal(existingRepos[i].type, repo.type);
        assert.isBoolean(repo.anonRead);
        assert.equal(existingRepos[i].anonRead, repo.anonRead);
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
      }, 'node-app')
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
