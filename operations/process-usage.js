var pm2 = require('pm2');

setInterval(function() {
  pm2.connect(true, function(err) {
      if (err) {
          throw err;
      }
      pm2.list(function(err, list) {
          if (err) {
              throw err;
          }
          list.forEach(function(item) {
              process.send({
                  name: item.name,
                  monit: item.monit
              });
          });
      });
  });
}, 5000);
