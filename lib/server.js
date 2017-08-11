const mongoose = require('mongoose');
const express = require('express');
const http = require('http');
const formidable = require('formidable');
const bodyParser = require('body-parser');

mongoose.connect('mongodb://localhost/deploy-sh');
mongoose.Promise = global.Promise;

const app = express();

const deploy = require('./deploy');
const { authenticate, register, logout, login } = require('./models/user');
const { getProxy, getDeployments, updateDeployments } = require('./models/deployment');
const { log } = require('./models/request');

const port = process.env.PORT || 5000;

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

app.post('/upload', authenticate, (req, res) => {
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

    getDeployments({
      username,
      token,
      name
    })
    .then((deployment) => {
      return deploy(deployment['subdomain'], bundle.path);
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
    .then((deployment) => {
      res.status(200).send(deployment);
    })
    .catch((error) => {
      res.status(500).send({ error: error.stack });
    });
  });

});

app.get('/api/deployments', authenticate, (req, res) => {
  const { token, username } = req.user;

  getDeployments({
    username,
    token
  })
  .then((deployments) => res.status(200).send({ deployments }))
  .catch((error) => res.status(500).send(error));
});

app.get('/api/deployments/:name', authenticate, (req, res) => {
  const { name } = req.params;
  const { token, username } = req.user;

  getDeployments({
    username,
    token,
    name
  })
  .then((deployment) => res.status(200).send({ deployment }))
  .catch((error) => res.status(500).send(error));
});

app.get('/api/logout', authenticate, (req, res) => {
  const { token, username } = req.user;

  logout({ username, token })
    .then(() => res.status(200).send({}))
    .catch(() => res.status(500).send({ error: 'could not logout from session' }));
});

app.get('/api/user', authenticate, (req, res) => {
  const { user } = req;

  delete user['token'];
  res.status(200).send({ user });
});

app.get('*', log, (req, res) => {
  const { url, method, headers } = req;
  const { host } = headers;

  // If this is not an upload request, it is a proxy request
  const subdomain = host.split('.')[0];
  getProxy({ subdomain })
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
      proxy.on('error', function() {
        res.status(502).end(`
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
                <h3>502</h3> <span> Sorry this page could not be loaded 🙈 </span>
              </div>
            </body>
          </html>
        `);
      });
      req.addListener('data', function(chunk) {
        proxy.write(chunk, 'binary');
      });
      req.addListener('end', function() {
        proxy.end();
      });
    })
    .catch(() => {
      res.status(404).end(`
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
              <h3>404</h3> <span> Sorry this page could not be found 🙈 </span>
            </div>
          </body>
        </html>
      `);
    });
});

app.listen(port, () => {
  console.log('⛅️ deploy.sh is running on port 5000'); // eslint-disable-line
});
