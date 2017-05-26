const spawn = require('child_process').spawn;

module.exports = (source, destination) => {
    return new Promise((resolve, reject) => {
        var clone = spawn('git', ['clone', source, destination]);
        let output = '';
        clone.on('stdout', (data) => {
            output += data;
        });
        clone.on('stderr', (data) => {
            output += data;
        });
        clone.on('close', (code) => {
            if (code == 0) {
                resolve();
            } else {
                reject(output);
            }
        });
    });
};
