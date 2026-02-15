import { createServer } from 'node:http';
import { apiMiddleware } from './api.ts';
import { setupWebSocket } from './ws.ts';
import { syncContainerStates, startAllContainers, stopAllContainers } from './lifecycle.ts';
import { startMaintenance } from './maintenance.ts';
import { notFoundPage } from './error-page.ts';

const PORT = parseInt(process.env.PORT || '80', 10);

const handler = apiMiddleware();

const server = createServer((req, res) => {
  handler(req, res, () => {
    notFoundPage(res);
  });
});

setupWebSocket(server);

// Graceful shutdown - stop all containers when deploy.sh stops
function shutdown(signal: string) {
  console.log(`\n${signal} received, shutting down...`);

  stopAllContainers();

  server.close(() => {
    console.log('deploy.sh stopped');
    process.exit(0);
  });

  // Force exit after 10 seconds if server hasn't closed
  setTimeout(() => {
    console.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.listen(PORT, () => {
  console.log(`deploy.sh server running on http://localhost:${PORT}`);
  syncContainerStates();
  startAllContainers();
  startMaintenance();
});
