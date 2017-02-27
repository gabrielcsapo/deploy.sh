const http = require('http');
const request = require('request');

const Events = require('./events');
const applications = [];

Events.on('application-added', (application) => {
    applications.push(application);
    console.log(`Application ${application.name} listening on ${application.port}`);  // eslint-disable-line
});

module.exports = (port) => {
  return http.createServer((req, res) => {
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
};
