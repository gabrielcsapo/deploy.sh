var repos = require('./repos');
var user = require('./user');
var db = require('./db');

var Process = function(name) {
    this.name = name;
    this.memory = [];
    this.cpu = [];
    this.traffic = [];
    this.logs = [];
    this.repo = {};
}
module.exports = {
    get: function(name) {
        if (name) {
            var process = new Process(name);
            process.memory = db(name, 'memory').value();
            process.cpu = db(name, 'cpu').value();
            process.traffic = db(name, 'traffic').value();
            process.logs = db(name, 'logs').value();
            process.repo = repos.get(name);
            if(process.repo && !process.repo.user) {
                process.repo.user = user.get();
            }
            return process;
        } else {
            return repos.get().map(function(repo) {
                var process = new Process(repo.name);
                process.memory = db(repo.name, 'memory').value();
                process.cpu = db(repo.name, 'cpu').value();
                process.traffic = db(repo.name, 'traffic').value();
                process.logs = db(repo.name, 'logs').value();
                process.repo = repo;
                if(process.repo && !process.repo.user) {
                    process.repo.user = user.get();
                }
                return process;
            });
        }
    }
}
