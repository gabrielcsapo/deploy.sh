const express = require('express');
const http = require('http');
const formidable = require('formidable');
const bodyParser = require('body-parser');

const app = express();

const deploy = require('./deploy');
const { getProxy, authenticate, register, logout, login, getDeployments, updateDeployments } = require('./helpers/db');

const port = process.env.PORT || 5000;

function _authenticate(req, res, next) {
  const { headers } = req;
  const username = headers['x-distribute-username'];
  const token = headers['x-distribute-token'];
  if(!username && !token) {
    res.status(500).send({ error: 'authentication necessary' });
  }

  authenticate({ username, token })
    .then(function (result) {
      req.user = result;
      next();
    })
    .catch(function () {
      res.status(500).send({ error: 'not authenticated' });
    });
}

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if(!username || !password) return res.status(500).send({ error: 'please provide username and password'});

  register({ username, password })
    .then((user) => res.status(200).send(user))
    .catch(() => res.status(500).send({ error: 'something went wrong' }));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if(!username || !password) return res.status(500).send({ error: 'please provide username and password'});

  login({ username, password })
    .then((user) => res.status(200).send(user))
    .catch(() => res.status(500).send({ error: 'password username combination not correct' }));
});

app.post('/upload', _authenticate, (req, res) => {
  const { user } = req;
  const { username, token } = user;

  const form = new formidable.IncomingForm();
  form.type = true;
  form.parse(req, (error, fields, files) => {
    if(error) {
      res.status(500).send({ error });
    }

    const { name } = fields;
    const { bundle } = files;

    let id = '';

    getDeployments({
      username,
      token,
      name
    })
    .then((deployment) => {
      id = deployment['id'];
      return deploy(id, bundle.path);
    })
    .then((output) => {
      const { port, directory, id } = output;
      return updateDeployments({
        name,
        username,
        token,
        deployment: {
          id,
          port,
          directory
        }
      });
    })
    .then((user) => {
      const { deployments } = user;
      const project = deployments.filter((d) => d.project === name)[0];

      res.status(200).send(project);
    })
    .catch((error) => {
      res.status(500).send({ error: error.stack });
    });
  });

});

app.get('/api/list', _authenticate, (req, res) => {
  const { token, username } = req.user;

  getDeployments({
    username,
    token
  })
  .then((deployments) => res.status(200).send({ deployments }))
  .catch((error) => res.status(500).send(error));
});

app.get('/api/logout', _authenticate, (req, res) => {
  const { token, username } = req.user;

  logout({ username, token })
    .then(() => res.status(200).send({}))
    .catch(() => res.status(500).send({ error: 'could not logout from session' }));
});

app.get('*', (req, res) => {
  const { url, method, headers } = req;
  const { host } = headers;

  // If this is not an upload request, it is a proxy request
  const hostname = host.split('.')[0];
  getProxy({ name: hostname })
    .then((port) => {
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
    })
    .catch(() => {
      res.end(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style media="screen">
              html, body {
                height: 100%;
                width: 100%;
                overflow: hidden;
              }
              .message {
                text-align: center;
                top: 50%;
                width: 100%;
                position: absolute;
              }
              h3 {
                display: inline-block;
                border-right: 1px solid #a2a2a2;
                padding-right: 10px;
              }
            </style>
            <title>Error</title>
          </head>
          <body>
            <div class="message">
              <h3>500</h3> <span> Sorry this page is no longer available 🙈 </span>
            </div>
          </body>
        </html>
      `);
    });
});

app.listen(port, () => {
  console.log('⛅️ node-distribute is running on port 5000'); // eslint-disable-line
});
