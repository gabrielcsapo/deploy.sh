var GitServer = require('git-server');
var path = require('path');

module.exports = function(log, admin, user, repos) {

    repos.forEach(function(repo) {
        repo.users[0].user = user;
    });

    server = new GitServer(repos, true, path.resolve(__dirname, '..', 'repos'), 7000);

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
        if(repo.last_commit.branch == 'master') {
            log.info('redeploy the app, build and start');
            admin.deploy(repo.path, repo.name);
        }
        // TODO: implement starting the app
        // TODO: use kue to create a priority queue to not block main process
        // TODO: deploy should clone the repo to app and do a npm install
        // TODO: once the deploy is done start node process using npm start (PM2?)
        update.accept();
    });
    server.on('fetch', function(update, repo) {
        log.info('git:fetch', repo.name, repo.last_commit.branch);
        update.accept();
    });
}
