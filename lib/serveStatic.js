const http = require('http');
const fs = require('fs');
const url = require('url');
const path = require('path');

const directory = process.env.DIRECTORY;
const port = process.env.PORT;

const server = http.createServer((req, res) => {

    let uri = url.parse(req.url).pathname;
    let filename = path.join(directory, uri);

    if (filename.indexOf(directory) !== 0) {
        res.writeHead(404, {
            "Content-Type": "text/plain"
        });
        res.write("404 Not Found\n");
        res.end();
        return;
    }

    fs.exists(filename, (exists) => {
        if (!exists) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.write("404 Not Found\n");
            res.end();
            return;
        }

        if (fs.statSync(filename).isDirectory()) filename += '/index.html';

        fs.readFile(filename, "binary", (err, file) => {
            if (err) {
                res.writeHead(500, { "Content-Type": "text/plain" });
                res.write(err + "\n");
                res.end();
                return;
            }

            res.writeHead(200);
            res.write(file, "binary");
            res.end();
        });
    });
});

server.listen(port);
