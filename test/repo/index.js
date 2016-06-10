var express = require('express');
var app = express();
var port = process.env.PORT || 3000;

app.use('*', function(req, res) {
    var url = req.originalUrl;

    var timeout = Math.floor((Math.random() * 100) + (url.length * Math.floor((Math.random() * 100) + 500)));
    setTimeout(function() {
        console.log(url, timeout); // eslint-disable-line no-console
        res.send('I am alive');
    }, timeout);
});

app.listen(port, function() {
    console.log('test application listening at http://localhost:' + port); // eslint-disable-line no-console
});
