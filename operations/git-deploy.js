var Git = require('nodegit');
var path = require('path');
var rmdir = require('rimraf');

module.exports = function(location, name) {
    var repo;
    var directory = path.resolve(__dirname, '..', 'app', name);
    rmdir(directory, function(err) {
        if (err) {
            throw err;
        }
        Git.Clone(location, directory)
            .then(function(repo) {
                return repo.getBranchCommit("master");
            })
            .then(function(commit) {
                console.log(name, ':', commit.message());
            })
            .catch(function(err) { console.log(err); });
    });
}
