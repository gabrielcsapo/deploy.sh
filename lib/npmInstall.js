const spawn = require('child_process').spawn;

module.exports = (cwd) => {
    return new Promise(function(resolve, reject) {
        var args = ['install', '--ignore-scripts', '--production'];
        var npm = spawn('npm', args, {
            cwd: cwd
        });
        npm.on('close', function(code) {
            if (code === 0) {
                resolve();
            } else {
                reject('error installing');
            }
        });
    });
}
