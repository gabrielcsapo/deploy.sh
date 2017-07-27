const async = require('async');
const Docker = require('dockerode');
const http = require('http');
const formidable = require('formidable');

const deploy = require('./deploy');

let ports = {};

const server = http.createServer((req, res) => {
  const { url, method, headers } = req;
  const { host } = headers;

  if(url == '/upload' && method == 'POST') {
    const form = new formidable.IncomingForm();
    form.type = true;
    form.parse(req, (error, fields, files) => {
      if(error) { res.status(500).send({ error }); }

      const { name } = fields;
      const { distribute } = files;

      deploy(name, distribute.path)
        .then((output) => {
          ports[output.name] = output.port;

          res.statusCode = 200;
          res.end(JSON.stringify({ output }));
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

server.listen(5000, () => {
  console.log('⛅️ node-distribute is running on port 5000'); // eslint-disable-line
});
