const http = require('http');
const Url = require('url');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT;

const map = {
  '.ico': 'image/x-icon',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword'
};

const cache = {};

http.createServer((req, res) => {
  let { url } = req;

  if (url === '/') url = '/index.html';

  console.log(`${req.method} ${url}`); // eslint-disable-line

  const parsedUrl = Url.parse(url);
  let pathname = `.${parsedUrl.pathname}`;

  if(cache[pathname]) {
    res.setHeader('Content-Type', cache[pathname]['Content-Type']);
    return res.end(cache[pathname]['data']);
  }

  const ext = path.parse(pathname).ext;

  fs.exists(pathname, (exist) => {
    if (!exist) {
      res.statusCode = 404;
      res.end(`File ${pathname} not found!`);
      return;
    }

    if (fs.statSync(pathname).isDirectory()) pathname += '/index' + ext;

    fs.readFile(pathname, (err, data) => {
      if (err) {
        res.statusCode = 500;
        res.end(`Error getting the file: ${err}.`);
      } else {
        cache[pathname] = {
          'Content-Type': map[ext] || 'text/plain',
          data
        };
        // if the file is found, set Content-type and send data
        res.setHeader('Content-Type', map[ext] || 'text/plain');
        res.end(data);
      }
    });
  });

}).listen(parseInt(port), () => {
  console.log(`Server listening on port ${port}`); // eslint-disable-line
});
