var Server = require('./server');
var Repos = require('./repos');
var db = require('./db');

/**
 * @class Process
 * @type {Object}
 * @property {string} name - the name of the process
 * @property {array} memory - holds memory obects [timestamp, value]
 * @property {array} cpu - holds cpu objects [timestamp, value]
 * @property {array} traffic - holds traffic objects [{...}]
 * @property {array} logs - holds the logs from the process
 * @property {Repo} repo - the repo that relates to this process
 * @property {Server} server - the server config for this process
 */
var Process = function() {
    this.name = '';
    this.memory = [];
    this.cpu = [];
    this.traffic = [];
    this.logs = [];
    this.repo = {};
    this.server = {};
};

module.exports = {
    /**
     * Gets the specificied process or all processes
     * @memberof Process
     * @function get
     * @param  {string=} name the process name
     * @return {Process}      an array or single object or Process object(s)
     */
    get: function(name) {
        if (name) {
            var process = new Process();
            process.name = name;
            process.memory = db(name, 'memory').value();
            process.cpu = db(name, 'cpu').value();
            process.traffic = db(name, 'traffic').value();
            process.logs = db(name, 'logs').value();
            process.repo = Repos.get(name);
            process.server = Server.get();
            return process;
        } else {
            return Repos.get().map(function(repo) {
                var process = new Process();
                process.name = repo.name;
                process.memory = db(repo.name, 'memory').value();
                process.cpu = db(repo.name, 'cpu').value();
                process.traffic = db(repo.name, 'traffic').value();
                process.logs = db(repo.name, 'logs').value();
                process.repo = repo;
                process.server = Server.get();
                return process;
            });
        }
    }
};
