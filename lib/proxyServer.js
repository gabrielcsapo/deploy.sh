const http = require('http');
const httpProxy = require('http-proxy');
const proxy = httpProxy.createProxyServer({});

const Events = require('./events');
const Traffic = require('./db').Traffic;
const applications = [];

Events.on('application-added', (application) => {
    applications.push(application);
    console.log(`Application ${application.name} listening on http://localhost:${application.port}`);  // eslint-disable-line
});

proxy.on('end', (req, res) => {
  new Traffic({
    url: req.headers.host + req.url,
    started: req.headers['x-started'],
    ended: new Date(),
    referrer: req.headers['Referrer'] || req.headers['referrer'],
    userAgent: req.headers['user-agent'],
    statusCode: res.statusCode
  }).save();
});

module.exports = (port) => {
  return http.createServer((req, res) => {
    req.headers['x-started'] = new Date();

    const parts = req.headers.host.split('.');
    const subdomain = parts.length === 1 ? '*' : parts[0];
    const application = applications.filter((app) => {
        return app.name === subdomain;
    })[0];
    if(application) {
        const target = `http://localhost:${application.port}`;
        try {
            proxy.web(req, res, {
                target
            });
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
