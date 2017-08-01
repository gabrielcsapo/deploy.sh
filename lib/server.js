const async = require('async');
const Docker = require('dockerode');
const express = require('express');
const http = require('http');
const formidable = require('formidable');
const passport = require('passport');
const bodyParser = require('body-parser');
const LocalStrategy = require('passport-local').Strategy;

const app = express();

const deploy = require('./deploy');
const { authenticate, register, login, getDeployments } = require('./helpers/db');

const port = process.env.PORT || 5000;

let ports = {};

function _authenticate(req, res, next) {
  const { headers } = req;
  const username = headers['x-distribute-username'];
  const token = headers['x-distribute-token'];

  authenticate({ username, token })
    .then(function (result) {
      req.user = result;
      next();
    })
    .catch(function (err) {
      res.status(500).send({ error: 'not authenticated' });
    });
}

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(passport.initialize());

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

passport.use(new LocalStrategy({
    passReqToCallback: true,
    session: false
  },
  function(req, username, password, done) {
    login({ username, password })
      .then((user) => {
        req.user = user;
        done(null, user);
      })
      .catch((ex) => {
        done('password username combination not correct');
      });
  }
));

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if(!username || !password) return res.status(500).send({ error: 'please provide username and password'});

  register({ username, password })
    .then(() => res.status(200).send({ success: 'user create successfully' }))
    .catch(() => res.status(500).send({ error: 'something went wrong' }));
});

app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }), (req, res) => {
  const { _id, token } = req.user;
  res.send({
    username: _id,
    token
  });
});

app.post('/upload', _authenticate, (req, res) => {
  const { headers, user } = req;
  const { host } = headers;

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
      username: user.username,
      token: user.token,
      name
    })
    .then((_id) => {
      id = _id;
      return deploy(id, bundle.path);
    })
    .then((output) => {
      ports[id] = output.port;
      res.status(200).send({
        url: `http://${id}.${host.indexOf('0.0.0.0') > -1 ? `localhost:${port}` : host}`
      });
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

app.get('*', (req, res) => {
  const { url, method, headers } = req;
  const { host } = headers;

  // If this is not an upload request, it is a proxy request
  const hostname = host.split('.')[0];
  const port = ports[hostname];
  if(port) {
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
  } else {
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

app.listen(port, () => {
  console.log('⛅️ node-distribute is running on port 5000'); // eslint-disable-line
});
