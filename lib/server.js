const express = require('express');
const formidable = require('formidable');
const bodyParser = require('body-parser');

const app = express();

const deploy = require('./deploy');
const { authenticateMiddleware, register, logout, login } = require('./models/user');
const { del, logs, get, getAll, proxy } = require('./models/deployment');
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

app.post('/upload', authenticateMiddleware, (req, res) => {
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

    deploy({
      name,
      bundlePath: bundle.path,
      token,
      username
    })
    .then((deployment) => {
      res.status(200).send(deployment);
    })
    .catch((error) => {
      res.status(500).send({ error: error.stack });
    });
  });

});

app.get('/api/deployments/:name/logs', authenticateMiddleware, (req, res) => {
  const { name } = req.params;
  const { token, username } = req.user;

  logs({
    name,
    username,
    token
  })
  .then((logs) => res.status(200).send({ logs }))
  .catch((error) => res.status(500).send(error));
});

app.get('/api/deployments', authenticateMiddleware, (req, res) => {
  const { token, username } = req.user;

  getAll({
    username,
    token
  })
  .then((deployments) => res.status(200).send({ deployments }))
  .catch((error) => res.status(500).send(error));
});

app.delete('/api/deployments/:name', authenticateMiddleware, (req, res) => {
  const { name } = req.params;
  const { token, username } = req.user;

  del({
    name,
    token,
    username
  })
  .then(() => res.status(200).send({}))
  .catch((error) => res.status(500).send({ error }));

});

app.get('/api/deployments/:name', authenticateMiddleware, (req, res) => {
  const { name } = req.params;
  const { token, username } = req.user;

  get({
    username,
    token,
    name
  })
  .then((deployment) => res.status(200).send({ deployment }))
  .catch((error) => res.status(500).send({ error }));
});

app.get('/api/logout', authenticateMiddleware, (req, res) => {
  const { token, username } = req.user;

  logout({ username, token })
    .then(() => res.status(200).send({}))
    .catch(() => res.status(500).send({ error: 'could not logout from session' }));
});

app.get('/api/user', authenticateMiddleware, (req, res) => {
  const { user } = req;

  delete user['token'];
  res.status(200).send({ user });
});

app.get('*', log, proxy);

app.listen(port, () => {
  console.log(`⛅️ deploy.sh is running on port ${port}`); // eslint-disable-line
});
