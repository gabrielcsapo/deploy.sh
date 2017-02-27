const pm2 = require('pm2');
const path = require('path');
const http = require('http');
const request = require('request');

const Events = require('./lib/events');
const startup = require('./lib/startup');
const startupServer = require('./lib/startupServer');

const directory = path.resolve(__dirname, 'tmp');
const port = process.env.PORT || 3000;
const applications = [];

Events.on('application-added', (application) => {
    applications.push(application);
    console.log(`Application ${application.name} listening on ${application.port}`);
});

const server = http.createServer((req, res) => {
  const parts = req.headers.host.split('.');
  const subdomain = parts.length === 1 ? '*' : parts[0];
  const application = applications.filter((app) => {
      return app.name === subdomain;
  })[0];
  if(application) {
      const url = `http://localhost:${application.port}${req.url}`;
      try {
          req.pipe(request(url)).pipe(res);
      } catch(ex) {
          res.end(res.writeHead(403, 'Route does not exist'));
      }
  } else {
      res.end(res.writeHead(403, 'Route does not exist'));
  }
}).listen(port, (err) => {
  if (err) {
    return console.error(err); // eslint-disable-line
  }
  console.log(`proxy server is listening on ${port}`); // eslint-disable-line
});

startup(directory)
    .catch((ex) => {
        console.error(ex); // eslint-disable-line
    })
    .then(() => {
        return startupServer(directory);
    });

function exit(options, err) {
    console.log(err);
    pm2.connect(function(err) {
      if (err) {
        console.error(err); // eslint-disable-line
        process.exit(2);
      }

      pm2.killDaemon(() => {
        pm2.disconnect();
        if (options.cleanup) console.log('clean');
        if (err) console.log(err.stack);
        if (options.exit) process.exit();
      });
    });
}

process.on('exit', exit.bind(null, { cleanup: true }));
process.on('SIGINT', exit.bind(null, { exit: true }));
process.on('uncaughtException', exit.bind(null, { exit: true }));
