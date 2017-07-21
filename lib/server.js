const express = require('express');
const formidable = require('formidable');
const app = express();

const deploy = require('./deploy');

app.post('/upload', (req, res) => {
  const form = new formidable.IncomingForm();

  form.parse(req, (error, fields, files) => {
    if(err) { res.status(500).send({ error }); }

    const { name } = fields;
    const { distribute } = files;

    deploy(name, `${distribute.path/${distribute.name}}`);

    res.status(200).end();
  });
});

app.listen(5000);
