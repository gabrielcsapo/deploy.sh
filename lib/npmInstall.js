const spawn = require('child_process').spawn;

module.exports = (cwd) => {
    return new Promise(function(resolve, reject) {
        const args = ['install', '--ignore-scripts', '--production'];
        const npm = spawn('npm', args, {
            cwd: cwd
        });
        let output = '';
        npm.on('stdout', function(data) {
            output += data;
        });
        npm.on('stderr', function(data) {
            output += data;
        });
        npm.on('close', function(code) {
            if (code === 0) {
                resolve();
            } else {
                reject(output);
            }
        });
    });
};
