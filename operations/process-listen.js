var pm2 = require('pm2');

pm2.connect(true, function(err) {
    if (err) {
        throw err;
    }
    pm2.launchBus(function(err, bus) {
        if (err) {
            throw err;
        }
        bus.on('log:*', function(type, packet) {
            process.send({
                type: type == 'out' ? 'LOG' : 'ERR',
                name: packet.process.name,
                data: packet.data.substring(0, packet.data.length - 1) // don't pass the new line character
            });
        });
    });
});
