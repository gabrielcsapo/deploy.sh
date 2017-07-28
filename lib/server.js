const async = require('async');
const Docker = require('dockerode');
const http = require('http');
const formidable = require('formidable');

const { hash } = require('./helpers/util');
const deploy = require('./deploy');

const port = process.env.PORT || 5000;

let ports = {};

const server = http.createServer((req, res) => {
  const { url, method, headers } = req;
  const { host } = headers;

  if(url == '/upload' && method == 'POST') {
    const form = new formidable.IncomingForm();
    form.type = true;
    form.parse(req, (error, fields, files) => {
      if(error) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error }));
      }

      const { name } = fields;
      const { distribute } = files;
      const id = `${name}-${hash(6)}`;

      deploy(id, distribute.path)
        .then((output) => {
          ports[id] = output.port;
          res.statusCode = 200;
          res.end(JSON.stringify({
            url: `http://${id}.${host.indexOf('0.0.0.0') > -1 ? `localhost:${port}` : host}`
          }));
        })
        .catch((error) => {
          res.statusCode = 500;
          res.end(JSON.stringify({ error }));
        });
    });
  } else {
    // If this is not an upload request, it is a proxy request
    const hostname = host.split('.')[0];
    const port = ports[hostname];

    var proxy = http.request({
      method,
      path: url,
      headers,
      port,
      host: 'localhost'
    });
    proxy.addListener('response', function (proxy_response) {
      proxy_response.addListener('data', function(chunk) {
        res.write(chunk, 'binary');
      });
      proxy_response.addListener('end', function() {
        res.end();
      });
      res.writeHead(proxy_response.statusCode, proxy_response.headers);
    });
    req.addListener('data', function(chunk) {
      proxy.write(chunk, 'binary');
    });
    req.addListener('end', function() {
      proxy.end();
    });
  }
});

process.on('SIGINT',() => {
  const docker = new Docker({ socketPath: '/var/run/docker.sock' });

  docker.listContainers((err, containers) => {
		async.eachSeries(containers, (container,callback) => {
			docker.getContainer(container.Id).stop(callback);
		},() => {
			async.eachSeries(containers, (container,callback) => {
				docker.getContainer(container.Id).remove(callback);
			},() => {
				process.exit();
			});
		});
	});
});

server.listen(port, () => {
  console.log('⛅️ node-distribute is running on port 5000'); // eslint-disable-line
});
