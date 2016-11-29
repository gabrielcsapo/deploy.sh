/**
 * Starts a pm2 thread and sends any uage information to the main thread
 * @module process-uage
 */

var pm2 = require('pm2');

// TODO: this should be customizable, interval checking
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
                  status: item.pm2_env.status,
                  created_at: item.pm2_env.created_at,
                  instances: item.pm2_env.instances,
                  name: item.name,
                  monit: item.monit
              });
          });
      });
  });
}, 5000);
