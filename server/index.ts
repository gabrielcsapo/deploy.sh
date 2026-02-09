import { createServer } from 'node:http';
import { apiMiddleware } from './api.ts';

const PORT = parseInt(process.env.PORT || '5050', 10);

const handler = apiMiddleware();

const server = createServer((req, res) => {
  handler(req, res, () => {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });
});

server.listen(PORT, () => {
  console.log(`deploy.sh server running on http://localhost:${PORT}`);
});
