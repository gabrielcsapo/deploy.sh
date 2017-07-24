#!/usr/bin/env node

const program = require('commander');

const updateNotifier = require('update-notifier');
const pkg = require('../package.json');

updateNotifier({pkg}).notify();

program
  .version(pkg.version)
  .parse(process.argv);

const tar = require('tar');
const fs = require('fs');

tar.c({
    gzip: true,
    portable: true,
    file: 'distribute.tgz'
  }, fs.readdirSync(process.cwd())
).then(() => {


  const Progress = require('progress');
  const request = require('request');
  const path = require('path');

  const totalLength = fs.readFileSync(path.resolve(process.cwd(), 'distribute.tgz')).length;
  const distribute = fs.createReadStream(path.resolve(process.cwd(), 'distribute.tgz'));

  request.post({ url:'http://0.0.0.0:5000/upload', formData: {
    name: path.basename(process.cwd()),
    distribute
  }}, function optionalCallback(err, httpResponse, body) {
    if (err) {
      return console.error('upload failed:', err); // eslint-disable-line
    }
    console.log('Upload successful!  Server responded with:', body); // eslint-disable-line
  });

  var bar = new Progress('  uploading [:bar] :rate/bps :percent :etas', { total: totalLength });

  distribute.on('data', function(chunk) {
    bar.tick(chunk.length);
  });
}).catch((err) => { console.log(err); }); // eslint-disable-line
