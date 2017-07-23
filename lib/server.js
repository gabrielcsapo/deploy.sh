const express = require('express');
const formidable = require('formidable');
const app = express();

const deploy = require('./deploy');

app.post('/upload', (req, res) => {
  const form = new formidable.IncomingForm();
  form.type = true;
  form.parse(req, (error, fields, files) => {
    if(error) { res.status(500).send({ error }); }

    const { name } = fields;
    const { distribute } = files;

    deploy(name, distribute.path)
      .then(() => {
        res.status(200).end();
      })
      .catch((error) => {
        res.status(500).send({ error });
      });
  });
});

app.listen(5000);
