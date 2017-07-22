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
).then(() => {

  const request = require('request');
  const path = require('path');
  
  request.post({ url:'http://0.0.0.0:5000/upload', formData: {
    name: path.basename(process.cwd()),
    distribute: fs.createReadStream(path.resolve(process.cwd(), 'distribute.tgz'))
  }}, function optionalCallback(err, httpResponse, body) {
    if (err) {
      return console.error('upload failed:', err);
    }
    console.log('Upload successful!  Server responded with:', body);
  });
}).catch((err) => { console.log(err); })
