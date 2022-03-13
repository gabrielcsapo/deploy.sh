const http = require("http");
const port = process.env.PORT || 8000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-type": "text/html; charset=utf-8" });
  res.write("Hello World 🌎");
  res.end();
});

server.listen(port, () => {
  console.log("🚀 server has liftoff");
});
