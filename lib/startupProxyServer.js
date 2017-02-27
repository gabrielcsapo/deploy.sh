const http = require('http');
const request = require('request');

const Events = require('./events');
const applications = [];

Events.on('application-added', (application) => {
    applications.push(application);
    console.log(`Application ${application.name} listening on http://localhost:${application.port}`);  // eslint-disable-line
});

module.exports = (port) => {
  return http.createServer((req, res) => {
    var started = new Date();
    req.on('end', () => {
      console.log(`${req.headers.host} request took ${(new Date() - started) / 1000} seconds`);
    });

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
      return process.exit(2);
    }
    console.log(`proxy server is listening on http://localhost:${port}`); // eslint-disable-line
  });
};
