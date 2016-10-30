var GitServer = require('git-server');
var path = require('path');

var gitDeploy = require('./git-deploy');
var log = require('./lib/log');

module.exports = function() {
    var user = require('./lib/user').get();
    var repos = require('./lib/repos').get();
    var reposDirectory = path.resolve(__dirname, '..', 'repos') + '/';

    repos.forEach(function(repo) {
        repo.users[0].user = user;
    });

    var server = new GitServer({
        repos: repos,
        repoLocation: reposDirectory,
        logging: true,
        port: 7000,
        httpApi: true
    });

    server.on('pre-receive', function(update, repo) {
        log.info('git:pre-receive', repo.name);
        update.accept();
    });

    server.on('update', function(update, repo) {
        log.info('git:update', repo.name);
        update.accept();
    });

    server.on('pre-rebase', function(update, repo) {
        log.info('git:pre-rebase', repo.name);
        update.accept();
    });

    server.on('pre-auto-gc', function(update, repo) {
        log.info('git:pre-auto-gc', repo.name);
        update.accept();
    });

    server.on('commit-msg', function(update, repo) {
        log.info('git:commit-msg', repo.name, repo.last_commit.branch);
        update.accept();
    });

    server.on('prepare-commit-msg', function(update, repo) {
        log.info('git:prepare-commit-msg', repo.name, repo.last_commit.branch);
        update.accept();
    });

    server.on('pre-commit', function(update, repo) {
        log.info('git:pre-commit', repo.name, repo.last_commit.branch);
        update.accept();
    });

    server.on('applypatch-msg', function(update, repo) {
        log.info('git:applypatch-msg', repo.name, repo.last_commit.branch);
        update.accept();
    });

    server.on('commit', function(update, repo) {
        log.info('git:commit', repo.name, repo.last_commit.branch);
        update.accept();
    });

    server.on('update', function(update, repo) {
        log.info('git:update', repo.name, repo.last_commit.branch);
        update.accept();
    });
    server.on('post-update', function(update, repo) {
        log.info('git:post-update', repo.name, repo.last_commit.branch);
        // TODO: this should be configurable...
        if (repo.last_commit.branch == 'master') {
            gitDeploy(repo.path, repo);
        }
        update.accept();
    });
    server.on('fetch', function(update, repo) {
        log.info('git:fetch', repo.name, repo.last_commit.branch);
        update.accept();
    });
}
