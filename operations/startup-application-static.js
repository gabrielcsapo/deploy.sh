var compression = require('compression');
var express = require('express');
var path = require('path');
var app = express();

var port = process.env.PORT;
var directory = process.env.DIRECTORY;

app.use(compression({ threshold: 0 }));
app.use(express.static(path.resolve(directory)));

app.listen(port, function() {
  console.log('static server listening on http://localhost:' + port); // eslint-disable-line no-console
});
