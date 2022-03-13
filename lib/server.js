import express from "express";
import formidable from "formidable";
import bodyParser from "body-parser";

const app = express();

import deploy from "./deploy.js";
import User from "./models/user.js";
import Deployment from "./models/deployment.js";
import Request from "./models/request.js";

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

app.post(
  "/register",
  asyncMiddleware(async (req, res) => {
    const { username, password } = req.body;

    console.log(username, password);
    if (!username || !password)
      return res
        .status(500)
        .send({ error: "please provide username and password" });

    try {
      const user = await User.register({ username, password });
      res.status(200).send(user);
    } catch (error) {
      console.log(error);
      res.status(500).send({ error: "something went wrong" });
    }
  })
);

app.post(
  "/login",
  asyncMiddleware(async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password)
      return res
        .status(500)
        .send({ error: "please provide username and password" });

    try {
      const user = await User.login({ username, password });
      res.status(200).send(user);
    } catch (error) {
      res.status(500).send({ error });
    }
  })
);

app.post(
  "/upload",
  User.authenticateMiddleware,
  asyncMiddleware(async (req, res) => {
    try {
      const { user } = req;
      const { username, token } = user;

      const { fields, files } = await formidablePromise(req, {
        type: true,
      });

      const { name } = fields;
      const { bundle } = files;

      const deployment = await deploy({
        name,
        bundlePath: bundle.filepath,
        token,
        username,
      });
      res.status(200).send({
        success: `application ${name} deployed successfully`,
        deployment,
      });
    } catch (ex) {
      console.log(ex);
      res.status(500).send({ error: ex.stack });
    }
  })
);

app.get(
  "/api/deployments/:name/logs",
  User.authenticateMiddleware,
  asyncMiddleware(async (req, res) => {
    const { name } = req.params;
    const { token, username } = req.user;

    try {
      const logs = await Deployment.logs({
        name,
        username,
        token,
      });
      res.status(200).send({ logs });
    } catch (ex) {
      res.status(500).send({ ex });
    }
  })
);

app.get(
  "/api/deployments",
  User.authenticateMiddleware,
  asyncMiddleware(async (req, res) => {
    const { token, username } = req.user;

    try {
      const deployments = await Deployment.getAll({
        username,
        token,
      });
      res.status(200).send({ deployments });
    } catch (error) {
      res.status(500).send({ error });
    }
  })
);

app.delete(
  "/api/deployments/:name",
  User.authenticateMiddleware,
  asyncMiddleware(async (req, res) => {
    const { name } = req.params;
    const { token, username } = req.user;

    try {
      await Deployment.del({
        name,
        token,
        username,
      });
      res
        .status(200)
        .send({ success: `deployment ${name} successfully deleted` });
    } catch (error) {
      res.status(500).send({ error });
    }
  })
);

app.get(
  "/api/deployments/:name",
  User.authenticateMiddleware,
  asyncMiddleware(async (req, res) => {
    const { name } = req.params;
    const { token, username } = req.user;

    try {
      const deployment = await Deployment.get({
        username,
        token,
        name,
      });
      res.status(200).send({ deployment });
    } catch (error) {
      res.status(500).send({ error });
    }
  })
);

app.get(
  "/api/logout",
  User.authenticateMiddleware,
  asyncMiddleware(async (req, res) => {
    const { token, username } = req.user;

    try {
      await User.logout({ username, token });
      res.status(200).send({ success: `${username} successfully deleted` });
    } catch (ex) {
      res.status(500).send({ error: "could not logout from session" });
    }
  })
);

app.get("/api/user", User.authenticateMiddleware, (req, res) => {
  const { user } = req;

  delete user["token"];
  res.status(200).send({ user });
});

app.get("*", Request.log, Deployment.proxy);

app.listen(port, () => {
  console.log(`⛅️ deploy.sh is running on port ${port}`); // eslint-disable-line
});
