#!/usr/bin/env node

const program = require('commander');

program
  .version(require('../package.json').version)
  .parse(process.argv);

const tar = require('tar');
const fs = require('fs');

tar.c({
    gzip: true,
    portable: true,
    file: 'distribute.tgz'
  }, fs.readdirSync(process.cwd())
).then(() => {  }).catch((err) => { console.log(err); })

const request = require('request');
const path = require('path');

request.post({ url:'http://0.0.0.0:5000/upload', formData: {
  distribute: fs.createReadStream(path.resolve(__dirname, '..', 'distribute.tgz'))
}}, function optionalCallback(err, httpResponse, body) {
  if (err) {
    return console.error('upload failed:', err);
  }
  console.log('Upload successful!  Server responded with:', body);
});
