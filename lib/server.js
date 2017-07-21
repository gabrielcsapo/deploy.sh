const formidable = require('formidable');
const http = require('http');
const util = require('util');

http.createServer(function(req, res) {
  if (req.url == '/upload' && req.method.toLowerCase() == 'post') {
    // parse a file upload
    var form = new formidable.IncomingForm();

    form.parse(req, function(err, fields, files) {
      res.writeHead(200, {'content-type': 'text/plain'});
      res.write('received upload:\n\n');
      console.log(util.inspect({fields: fields, files: files}));
      res.end(util.inspect({fields: fields, files: files}));
    });
  } else {
    res.end('hi');
  }
}).listen(5000);
