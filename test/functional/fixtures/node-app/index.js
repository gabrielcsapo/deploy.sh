var bodyParser = require('body-parser');
var express = require('express');
var app = express();
var port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());

app.post('/post', function(req, res) {
    var name = req.body.name;
    res.send(`hello ${name}`);
});

app.put('/put/:id', function(req, res) {
    var id = req.params.id;
    res.send(`updated ${id} with ${JSON.stringify(req.body)}`);
});

app.delete('/delete/:id', function(req, res) {
    var id = req.params.id;
    res.send(`deleted request with id ${id}`);
});

app.use('*', function(req, res) {
    var url = req.originalUrl;

    var timeout = Math.floor((Math.random() * 10) + (url.length * Math.floor((Math.random() * 10) + 250)));
    setTimeout(function() {
        console.log(url, timeout); // eslint-disable-line no-console
        res.send('I am alive');
    }, timeout);
});

app.listen(port, function() {
    console.log('test application listening at http://localhost:' + port); // eslint-disable-line no-console
});
