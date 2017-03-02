const spawn = require('child_process').spawn;

module.exports = (cwd) => {
    return new Promise((resolve, reject) => {
        const args = ['install', '--ignore-scripts', '--production'];
        const npm = spawn('npm', args, {
            cwd: cwd
        });
        let output = '';
        npm.on('stdout', (data) => {
            output += data;
        });
        npm.on('stderr', (data) => {
            output += data;
        });
        npm.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(output);
            }
        });
    });
};
