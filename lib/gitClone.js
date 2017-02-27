const spawn = require('child_process').spawn;

module.exports = function(source, destination) {
    return new Promise(function(resolve, reject) {
        process.nextTick(() => {
            var clone = spawn('git', ['clone', source, destination]);
            let output = '';
            clone.on('stdout', function(data) {
                output += data;
            });
            clone.on('stderr', function(data) {
                output += data;
            });
            clone.on('close', function(code) {
                if (code == 0) {
                    resolve();
                } else {
                    reject(output);
                }
            });
        });
    });
};
