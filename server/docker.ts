import { execSync, spawn } from 'node:child_process';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer, type AddressInfo } from 'node:net';

// ── Port allocation ─────────────────────────────────────────────────────────

export function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, () => {
      const port = (srv.address() as AddressInfo).port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

// ── Project classification ──────────────────────────────────────────────────

export function classifyProject(dir: string): string | null {
  if (existsSync(resolve(dir, 'Dockerfile'))) return 'docker';
  if (existsSync(resolve(dir, 'package.json'))) return 'node';
  if (existsSync(resolve(dir, 'index.html'))) return 'static';
  return null;
}

// ── Dockerfile generation ───────────────────────────────────────────────────

function generateNodeDockerfile(dir: string) {
  const content = `FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm install --production
CMD ["npm", "start"]
`;
  writeFileSync(resolve(dir, 'Dockerfile'), content);
}

function generateStaticDockerfile(dir: string) {
  // Inline a tiny static file server
  const serverCode = `
const http = require('http');
const fs = require('fs');
const path = require('path');

const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let filePath = path.join('/app/public', req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(process.env.PORT || 3000);
`;
  writeFileSync(resolve(dir, '_static_server.js'), serverCode);

  const content = `FROM node:22-alpine
WORKDIR /app
COPY . /app/public
COPY _static_server.js /app/_static_server.js
CMD ["node", "/app/_static_server.js"]
`;
  writeFileSync(resolve(dir, 'Dockerfile'), content);
}

export function ensureDockerfile(dir: string, type: string) {
  if (existsSync(resolve(dir, 'Dockerfile'))) return;
  if (type === 'node') generateNodeDockerfile(dir);
  if (type === 'static') generateStaticDockerfile(dir);
}

// ── Docker build & run ──────────────────────────────────────────────────────

export function buildImage(name: string, dir: string): Promise<string> {
  const tag = `deploy-sh-${name}`;

  return new Promise((resolve, reject) => {
    const proc = spawn('docker', ['build', '-t', tag, '.'], {
      cwd: dir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
      // Log build progress to console
      process.stdout.write(data);
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(tag);
      } else {
        reject(new Error(`Docker build failed with code ${code}\n${stderr}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to start docker build: ${err.message}`));
    });
  });
}

export async function runContainer(
  imageTag: string,
  name: string,
  port: number,
  volumeDir?: string,
) {
  const containerName = `deploy-sh-${name}`;

  // Remove old container with same name if it exists
  try {
    execSync(`docker rm -f ${containerName}`, { stdio: 'pipe' });
  } catch {
    // ignore
  }

  // Build volume mount flags
  let volumeFlags = '';
  if (volumeDir) {
    const dataVolume = resolve(volumeDir, 'data');
    const uploadsVolume = resolve(volumeDir, 'uploads');

    // Ensure directories exist
    mkdirSync(dataVolume, { recursive: true });
    mkdirSync(uploadsVolume, { recursive: true });

    volumeFlags = `-v ${dataVolume}:/app/data -v ${uploadsVolume}:/app/uploads`;
  }

  execSync(
    `docker run -d --name ${containerName} -p ${port}:3000 -e PORT=3000 ${volumeFlags} ${imageTag}`,
    { stdio: 'pipe' },
  );

  // Get the container ID
  const id = execSync(`docker inspect --format='{{.Id}}' ${containerName}`, { stdio: 'pipe' })
    .toString()
    .trim();

  return { id, containerName };
}

export function stopContainer(name: string) {
  const containerName = `deploy-sh-${name}`;
  try {
    execSync(`docker rm -f ${containerName}`, { stdio: 'pipe' });
  } catch {
    // ignore if already gone
  }
}

export function getContainerStatus(name: string): string {
  const containerName = `deploy-sh-${name}`;
  try {
    const status = execSync(`docker inspect --format='{{.State.Status}}' ${containerName}`, {
      stdio: 'pipe',
    })
      .toString()
      .trim();
    return status;
  } catch {
    return 'stopped';
  }
}

export function streamLogs(name: string) {
  const containerName = `deploy-sh-${name}`;
  return spawn('docker', ['logs', '-f', containerName], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

export interface ContainerInspect {
  id: string;
  image: string;
  created: string;
  started: string;
  finished: string;
  status: string;
  restartCount: number;
  platform: string;
  ports: Record<string, unknown>;
  env: string[];
}

export function getContainerInspect(name: string): ContainerInspect | null {
  const containerName = `deploy-sh-${name}`;
  try {
    const raw = execSync(`docker inspect ${containerName}`, { stdio: 'pipe' }).toString();
    const info = JSON.parse(raw)[0];
    return {
      id: info.Id,
      image: info.Config?.Image || info.Image,
      created: info.Created,
      started: info.State?.StartedAt,
      finished: info.State?.FinishedAt,
      status: info.State?.Status,
      restartCount: info.RestartCount || 0,
      platform: info.Platform,
      ports: info.NetworkSettings?.Ports || {},
      env: (info.Config?.Env || []).filter(
        (e: string) =>
          !e.startsWith('PATH=') && !e.startsWith('NODE_VERSION=') && !e.startsWith('YARN_'),
      ),
    };
  } catch {
    return null;
  }
}

export interface ContainerStats {
  cpu: string;
  mem: string;
  memPerc: string;
  net: string;
  block: string;
  pids: string;
}

export function getContainerStats(name: string): ContainerStats | null {
  const containerName = `deploy-sh-${name}`;
  try {
    const raw = execSync(
      `docker stats --no-stream --format '{"cpu":"{{.CPUPerc}}","mem":"{{.MemUsage}}","memPerc":"{{.MemPerc}}","net":"{{.NetIO}}","block":"{{.BlockIO}}","pids":"{{.PIDs}}"}' ${containerName}`,
      { stdio: 'pipe' },
    )
      .toString()
      .trim();
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseBytes(str: string): number {
  const match = str.trim().match(/^([\d.]+)\s*(B|kB|KiB|MB|MiB|GB|GiB|TB|TiB)$/);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    B: 1,
    kB: 1000,
    KiB: 1024,
    MB: 1e6,
    MiB: 1024 * 1024,
    GB: 1e9,
    GiB: 1024 * 1024 * 1024,
    TB: 1e12,
    TiB: 1024 * 1024 * 1024 * 1024,
  };
  return Math.round(val * (multipliers[unit] || 1));
}

function parsePair(str: string): [number, number] {
  const parts = str.split('/').map((s) => s.trim());
  return [parseBytes(parts[0]), parseBytes(parts[1] || '0')];
}

export interface RawContainerStats {
  cpuPercent: number;
  memUsageBytes: number;
  memLimitBytes: number;
  memPercent: number;
  netRxBytes: number;
  netTxBytes: number;
  blockReadBytes: number;
  blockWriteBytes: number;
  pids: number;
  timestamp: number;
}

export function getContainerStatsRaw(name: string): RawContainerStats | null {
  const stats = getContainerStats(name);
  if (!stats) return null;
  const [memUsage, memLimit] = parsePair(stats.mem);
  const [netRx, netTx] = parsePair(stats.net);
  const [blockRead, blockWrite] = parsePair(stats.block);
  return {
    cpuPercent: parseFloat(stats.cpu) || 0,
    memUsageBytes: memUsage,
    memLimitBytes: memLimit,
    memPercent: parseFloat(stats.memPerc) || 0,
    netRxBytes: netRx,
    netTxBytes: netTx,
    blockReadBytes: blockRead,
    blockWriteBytes: blockWrite,
    pids: parseInt(stats.pids, 10) || 0,
    timestamp: Date.now(),
  };
}

export function restartContainer(name: string) {
  const containerName = `deploy-sh-${name}`;
  execSync(`docker restart ${containerName}`, { stdio: 'pipe' });
}
