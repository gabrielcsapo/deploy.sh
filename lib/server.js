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

const asyncMiddleware = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const formidablePromise = (req, opts) => {
  return new Promise(function (resolve, reject) {
    var form = new formidable.IncomingForm(opts);
    form.parse(req, function (err, fields, files) {
      if (err) return reject(err);
      resolve({ fields: fields, files: files });
    });
  });
};

app.post('/register', asyncMiddleware(async (req, res) => {
  const { username, password } = req.body;
  if(!username || !password) return res.status(500).send({ error: 'please provide username and password'});

  try {
    const user = await register({ username, password });
    res.status(200).send(user);
  } catch(error) {
    res.status(500).send({ error: 'something went wrong' });
  }
}));

app.post('/login', asyncMiddleware(async (req, res) => {
  const { username, password } = req.body;

  if(!username || !password) return res.status(500).send({ error: 'please provide username and password'});

  try {
    const user = await login({ username, password });
    res.status(200).send(user);
  } catch(error) {
    res.status(500).send({ error });
  }
}));

app.post('/upload', authenticateMiddleware, asyncMiddleware(async (req, res) => {
  try {
    const { user } = req;
    const { username, token } = user;

    const { fields, files } = await formidablePromise(req, {
      type: true
    });

    const { name } = fields;
    const { bundle } = files;

    const deployment = await deploy({
      name,
      bundlePath: bundle.filepath,
      token,
      username
    });
    res.status(200).send({ success: `application ${name} deployed successfully`, deployment });
  } catch(ex) {
    res.status(500).send({ error: ex.stack });
  }
}));

app.get('/api/deployments/:name/logs', authenticateMiddleware, asyncMiddleware(async (req, res) => {
  const { name } = req.params;
  const { token, username } = req.user;

  try {
    const _logs = await logs({
      name,
      username,
      token
    });
    res.status(200).send({ logs: _logs });
  } catch(ex) {
    res.status(500).send({ ex });
  }
}));

app.get('/api/deployments', authenticateMiddleware, asyncMiddleware(async (req, res) => {
  const { token, username } = req.user;

  try {
    const deployments = await getAll({
      username,
      token
    });
    res.status(200).send({ deployments });
  } catch(error) {
    res.status(500).send({ error });
  }
}));

app.delete('/api/deployments/:name', authenticateMiddleware, asyncMiddleware(async (req, res) => {
  const { name } = req.params;
  const { token, username } = req.user;

  try {
    await del({
      name,
      token,
      username
    });
    res.status(200).send({ success: `deployment ${name} successfully deleted` });
  } catch(error) {
    res.status(500).send({ error });
  }
}));

app.get('/api/deployments/:name', authenticateMiddleware, asyncMiddleware(async (req, res) => {
  const { name } = req.params;
  const { token, username } = req.user;

  try {
    const deployment = await get({
      username,
      token,
      name
    });
    res.status(200).send({ deployment });
  } catch(error) {
    res.status(500).send({ error });
  }
}));

app.get('/api/logout', authenticateMiddleware, asyncMiddleware(async (req, res) => {
  const { token, username } = req.user;

  try {
    await logout({ username, token });
    res.status(200).send({ success: `${username} successfully deleted` });
  } catch(ex) {
    res.status(500).send({ error: 'could not logout from session' });
  }
}));

app.get('/api/user', authenticateMiddleware, (req, res) => {
  const { user } = req;

  delete user['token'];
  res.status(200).send({ user });
});

app.get('*', log, proxy);

app.listen(port, () => {
  console.log(`⛅️ deploy.sh is running on port ${port}`); // eslint-disable-line
});
