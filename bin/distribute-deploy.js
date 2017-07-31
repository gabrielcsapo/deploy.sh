const tar = require('tar');
const fs = require('fs');
const request = require('request');
const ora = require('ora');
const path = require('path');

tar.c({
  gzip: true,
  portable: true,
  file: 'distribute.tgz'
}, fs.readdirSync(process.cwd())).then(() => {
  const spinner = ora(`Uploading application bundle`).start();

  const distribute = fs.createReadStream(path.resolve(process.cwd(), 'distribute.tgz'));

  request.post({
    url: 'http://0.0.0.0:5000/upload',
    formData: {
      name: path.basename(process.cwd()),
      distribute
    }
  }, function optionalCallback(err, httpResponse, body) {
    if (err) {
      return spinner.fail('Deployment failed 🙈');
    }
    const response = JSON.parse(body);
    if (response.error) {
      spinner.fail(`Upload failed ${response.error}`);
    } else {
      spinner.succeed(`Upload succeed ${response.url}`);
    }
  });
}).catch((err) => {
  console.log(err);
}); // eslint-disable-line
