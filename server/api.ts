import { mkdirSync, createWriteStream, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { type IncomingMessage, type ServerResponse, request as httpRequest } from 'node:http';
import { startMetricsCollector } from './metrics-collector.ts';
import { registerHost, unregisterHost, registerAllDeployments } from './mdns.ts';
import {
  registerUser,
  loginUser,
  authenticate,
  logoutUser,
  getUser,
  changePassword,
  saveDeployment,
  getDeployment,
  getDeployments,
  deleteDeployment,
  updateDeploymentSettings,
  getUploadsDir,
  addDeployEvent,
  getDeployHistory,
  logRequest,
  getRequestLogs,
  getRequestSummary,
  saveBackup,
  getBackups,
  deleteBackupRecord,
  saveBuildLog,
  getBuildLogs,
} from './store.ts';
import {
  classifyProject,
  ensureDockerfile,
  buildImage,
  runContainer,
  stopContainer,
  getContainerStatus,
  streamLogs,
  getAvailablePort,
  getContainerInspect,
  getContainerStats,
  restartContainer,
} from './docker.ts';
import {
  getVolumeDir,
  createBackup,
  restoreBackup,
  deleteBackupFile,
  deleteVolumes,
  getVolumeSize,
} from './volumes.ts';

// ── Helpers ─────────────────────────────────────────────────────────────────

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function json(res: ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
  });
  res.end(JSON.stringify(data));
}

function error(res: ServerResponse, message: string, status = 400) {
  json(res, { error: message }, status);
}

function getAuth(req: IncomingMessage) {
  const username = req.headers['x-deploy-username'] as string | undefined;
  const token = req.headers['x-deploy-token'] as string | undefined;
  return { username, token };
}

function requireAuth(
  req: IncomingMessage,
  res: ServerResponse,
): { username: string; token: string } | null {
  const { username, token } = getAuth(req);
  if (!authenticate(username, token)) {
    error(res, 'Unauthorized', 401);
    return null;
  }
  return { username: username!, token: token! };
}

// ── Multipart parser (minimal) ──────────────────────────────────────────────

function parseMultipart(buffer: Buffer, contentType: string) {
  const boundaryMatch = contentType.match(/boundary=(.+)/);
  if (!boundaryMatch) return null;
  const boundary = boundaryMatch[1].trim();
  const parts: Record<string, string | { filename: string; data: Buffer }> = {};

  const boundaryBuffer = Buffer.from(`--${boundary}`);
  let start = buffer.indexOf(boundaryBuffer) + boundaryBuffer.length;

  while (start < buffer.length) {
    // Skip \r\n after boundary
    if (buffer[start] === 0x0d) start += 2;
    if (buffer[start] === 0x2d && buffer[start + 1] === 0x2d) break; // --

    const headerEnd = buffer.indexOf('\r\n\r\n', start);
    if (headerEnd === -1) break;

    const headers = buffer.subarray(start, headerEnd).toString();
    const bodyStart = headerEnd + 4;

    const nextBoundary = buffer.indexOf(boundaryBuffer, bodyStart);
    const bodyEnd = nextBoundary === -1 ? buffer.length : nextBoundary - 2; // -2 for \r\n

    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);

    if (nameMatch) {
      const name = nameMatch[1];
      if (filenameMatch) {
        parts[name] = { filename: filenameMatch[1], data: buffer.subarray(bodyStart, bodyEnd) };
      } else {
        parts[name] = buffer.subarray(bodyStart, bodyEnd).toString().trim();
      }
    }

    start = nextBoundary + boundaryBuffer.length;
  }

  return parts;
}

// ── Reverse proxy helper ─────────────────────────────────────────────────

function proxyToApp(
  req: IncomingMessage,
  res: ServerResponse,
  deployment: { name: string; port: number | null },
  targetPath: string,
  search: string,
  method: string,
) {
  const startTime = Date.now();

  const proxyReq = httpRequest(
    {
      hostname: 'localhost',
      port: deployment.port,
      path: targetPath + (search || ''),
      method,
      headers: {
        ...req.headers,
        host: `localhost:${deployment.port}`,
      },
    },
    (proxyRes) => {
      const duration = Date.now() - startTime;
      logRequest(deployment.name, {
        method,
        path: targetPath,
        status: proxyRes.statusCode!,
        duration,
        timestamp: Date.now(),
      });

      res.writeHead(proxyRes.statusCode!, {
        ...proxyRes.headers,
        'Access-Control-Allow-Origin': '*',
      });
      proxyRes.pipe(res);
    },
  );

  proxyReq.on('error', () => {
    const duration = Date.now() - startTime;
    logRequest(deployment.name, {
      method,
      path: targetPath,
      status: 502,
      duration,
      timestamp: Date.now(),
    });
    error(res, 'App unavailable', 502);
  });

  return proxyReq;
}

// ── Middleware ───────────────────────────────────────────────────────────────

type NextFn = () => void;

export function apiMiddleware() {
  startMetricsCollector();
  registerHost('deploy');
  registerAllDeployments();
  return async (req: IncomingMessage, res: ServerResponse, next: NextFn) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const path = url.pathname;
    const method = req.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      });
      res.end();
      return;
    }

    // ── mDNS-based app proxy (<name>.local:PORT) ──────────────────────────
    const host = req.headers.host || '';
    const hostname = host.split(':')[0];
    if (hostname.endsWith('.local') && hostname !== 'deploy.local') {
      const appName = hostname.slice(0, -'.local'.length);
      const d = getDeployment(appName);
      if (!d) return error(res, 'App not found', 404);

      const body = await readBody(req);
      const proxyReq = proxyToApp(req, res, d, path, url.search, method!);
      if (body.length > 0) proxyReq.write(body);
      proxyReq.end();
      return;
    }

    try {
      // ── Auth routes ───────────────────────────────────────────────────────

      if (path === '/register' && method === 'POST') {
        const body = JSON.parse((await readBody(req)).toString());
        if (!body.username || !body.password) {
          return error(res, 'Username and password required');
        }
        const result = registerUser(body.username as string, body.password as string);
        if ('error' in result) return error(res, result.error!, result.status!);
        return json(res, { token: result.token }, 201);
      }

      if (path === '/login' && method === 'POST') {
        const body = JSON.parse((await readBody(req)).toString());
        if (!body.username || !body.password) {
          return error(res, 'Username and password required');
        }
        const result = loginUser(body.username as string, body.password as string);
        if ('error' in result) return error(res, result.error!, result.status!);
        return json(res, { token: result.token });
      }

      if (path === '/api/logout' && method === 'GET') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        logoutUser(auth.username, auth.token);
        return json(res, { message: 'Logged out' });
      }

      if (path === '/api/user' && method === 'GET') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const user = getUser(auth.username);
        return json(res, user);
      }

      if (path === '/api/user/password' && method === 'POST') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const body = JSON.parse((await readBody(req)).toString());
        if (!body.currentPassword || !body.newPassword) {
          return error(res, 'Current password and new password required');
        }
        const result = changePassword(auth.username, body.currentPassword, body.newPassword);
        if ('error' in result) return error(res, result.error!, result.status!);
        return json(res, { message: 'Password changed' });
      }

      // ── Upload / Deploy ─────────────────────────────────────────────────

      if (path === '/upload' && method === 'POST') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const { username } = auth;

        const body = await readBody(req);
        const contentType = req.headers['content-type'] || '';
        const parts = parseMultipart(body, contentType);

        if (!parts || !parts.file || typeof parts.file === 'string') {
          return error(res, 'No file uploaded');
        }

        const name = (typeof parts.name === 'string' ? parts.name : null) || 'app';
        const uploadsDir = getUploadsDir();
        const deployDir = resolve(uploadsDir, name);

        // Clean and recreate deploy dir
        if (existsSync(deployDir)) {
          execSync(`rm -rf ${JSON.stringify(deployDir)}`);
        }
        mkdirSync(deployDir, { recursive: true });

        // Write tarball and extract
        const tarPath = resolve(deployDir, 'upload.tar.gz');
        const ws = createWriteStream(tarPath);
        ws.write(parts.file.data);
        ws.end();
        await new Promise<void>((resolve) => ws.on('finish', resolve));

        execSync(`tar -xzf upload.tar.gz`, { cwd: deployDir, stdio: 'pipe' });
        execSync(`rm upload.tar.gz`, { cwd: deployDir, stdio: 'pipe' });

        // Classify and build
        const type = classifyProject(deployDir);
        if (!type) {
          return error(
            res,
            'Unknown project type. Need a Dockerfile, package.json, or index.html.',
          );
        }

        ensureDockerfile(deployDir, type);

        // Auto-backup existing deployment if autoBackup is enabled
        const existingDeployment = getDeployment(name);
        if (existingDeployment && existingDeployment.autoBackup) {
          try {
            console.log(`Creating auto-backup for ${name}...`);
            const backup = await createBackup(name, 'pre-deploy');
            saveBackup({
              deploymentName: name,
              filename: backup.filename,
              label: 'pre-deploy',
              sizeBytes: backup.sizeBytes,
              createdBy: username,
              createdAt: backup.timestamp,
              volumePaths: ['data', 'uploads'],
            });
            console.log(`Auto-backup created: ${backup.filename} (${(backup.sizeBytes / 1024 / 1024).toFixed(2)} MB, volume: ${(backup.volumeSizeBytes / 1024 / 1024).toFixed(2)} MB)`);
          } catch (err) {
            console.error('Auto-backup failed:', err);
            // Continue deployment even if backup fails
          }
        }

        console.log(`Building ${name} (${type})...`);
        const buildResult = await buildImage(name, deployDir);

        // Save build log
        saveBuildLog({
          deploymentName: name,
          output: buildResult.output,
          success: buildResult.success,
          duration: buildResult.duration,
        });

        // If build failed, return error
        if (!buildResult.success) {
          return error(res, `Build failed after ${buildResult.duration}ms. Check build logs for details.`, 500);
        }

        const port = await getAvailablePort();
        console.log(`Starting ${name} on port ${port}...`);
        const volumeDir = getVolumeDir(name);
        const { id, containerName } = await runContainer(buildResult.tag, name, port, volumeDir);

        saveDeployment({
          name,
          type,
          username,
          port,
          containerId: id,
          containerName,
          directory: deployDir,
          createdAt: new Date().toISOString(),
        });

        addDeployEvent(name, { action: 'deploy', username, type, port, containerId: id });
        registerHost(name);

        const deployHost = req.headers.host || 'localhost:5173';
        const deployPort = deployHost.split(':')[1] || '5173';
        console.log(`Deployed ${name} → http://${name}.local:${deployPort}`);
        return json(res, { name, type, port, containerId: id }, 201);
      }

      // ── Deployment management ───────────────────────────────────────────

      if (path === '/api/deployments' && method === 'GET') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const deps = getDeployments(auth.username).map((d) => ({
          ...d,
          status: getContainerStatus(d.name),
        }));
        return json(res, deps);
      }

      const deploymentMatch = path.match(/^\/api\/deployments\/([^/]+)$/);
      if (deploymentMatch && method === 'GET') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const d = getDeployment(deploymentMatch[1]);
        if (!d || d.username !== auth.username) return error(res, 'Not found', 404);
        return json(res, { ...d, status: getContainerStatus(d.name) });
      }

      if (deploymentMatch && method === 'DELETE') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const name = deploymentMatch[1];
        const d = getDeployment(name);
        if (!d || d.username !== auth.username) return error(res, 'Not found', 404);
        stopContainer(name);
        unregisterHost(name);
        deleteVolumes(name);
        addDeployEvent(name, { action: 'delete', username: auth.username });
        deleteDeployment(name);
        return json(res, { message: `Deleted ${name}` });
      }

      if (deploymentMatch && method === 'PATCH') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const name = deploymentMatch[1];
        const d = getDeployment(name);
        if (!d || d.username !== auth.username) return error(res, 'Not found', 404);

        const body = JSON.parse((await readBody(req)).toString());
        updateDeploymentSettings(name, { autoBackup: body.autoBackup });

        return json(res, { message: 'Settings updated' });
      }

      const logsMatch = path.match(/^\/api\/deployments\/([^/]+)\/logs$/);
      if (logsMatch && method === 'GET') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const name = logsMatch[1];
        const d = getDeployment(name);
        if (!d || d.username !== auth.username) return error(res, 'Not found', 404);

        res.writeHead(200, {
          'Content-Type': 'text/plain',
          'Transfer-Encoding': 'chunked',
          'Access-Control-Allow-Origin': '*',
        });

        const proc = streamLogs(name);
        proc.stdout!.pipe(res);
        proc.stderr!.pipe(res);
        proc.on('close', () => res.end());
        req.on('close', () => proc.kill());
        return;
      }

      // ── Container inspect / stats / restart / history ──────────────────

      const inspectMatch = path.match(/^\/api\/deployments\/([^/]+)\/inspect$/);
      if (inspectMatch && method === 'GET') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const name = inspectMatch[1];
        const d = getDeployment(name);
        if (!d || d.username !== auth.username) return error(res, 'Not found', 404);
        const info = getContainerInspect(name);
        if (!info) return error(res, 'Container not found', 404);
        return json(res, info);
      }

      const statsMatch = path.match(/^\/api\/deployments\/([^/]+)\/stats$/);
      if (statsMatch && method === 'GET') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const name = statsMatch[1];
        const d = getDeployment(name);
        if (!d || d.username !== auth.username) return error(res, 'Not found', 404);
        const stats = getContainerStats(name);
        if (!stats) return error(res, 'Container not running', 404);
        return json(res, stats);
      }

      const restartMatch = path.match(/^\/api\/deployments\/([^/]+)\/restart$/);
      if (restartMatch && method === 'POST') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const name = restartMatch[1];
        const d = getDeployment(name);
        if (!d || d.username !== auth.username) return error(res, 'Not found', 404);
        restartContainer(name);
        addDeployEvent(name, { action: 'restart', username: auth.username });
        return json(res, { message: `Restarted ${name}` });
      }

      const historyMatch = path.match(/^\/api\/deployments\/([^/]+)\/history$/);
      if (historyMatch && method === 'GET') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const name = historyMatch[1];
        const d = getDeployment(name);
        if (!d || d.username !== auth.username) return error(res, 'Not found', 404);
        return json(res, getDeployHistory(name));
      }

      // ── Request logs API ───────────────────────────────────────────────

      const requestLogsMatch = path.match(/^\/api\/deployments\/([^/]+)\/requests$/);
      if (requestLogsMatch && method === 'GET') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const name = requestLogsMatch[1];
        const d = getDeployment(name);
        if (!d || d.username !== auth.username) return error(res, 'Not found', 404);
        return json(res, {
          logs: getRequestLogs(name),
          summary: getRequestSummary(name),
        });
      }

      // ── Backup management ──────────────────────────────────────────────

      // Create backup or list backups
      const backupsMatch = path.match(/^\/api\/deployments\/([^/]+)\/backups$/);
      if (backupsMatch && method === 'POST') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const name = backupsMatch[1];
        const d = getDeployment(name);
        if (!d || d.username !== auth.username) return error(res, 'Not found', 404);

        const body = JSON.parse((await readBody(req)).toString());
        const label = body.label || null;

        const result = await createBackup(name, label);
        saveBackup({
          deploymentName: name,
          filename: result.filename,
          label,
          sizeBytes: result.sizeBytes,
          createdBy: auth.username,
          createdAt: result.timestamp,
          volumePaths: ['data', 'uploads'],
        });

        addDeployEvent(name, { action: 'backup', username: auth.username });
        return json(res, result, 201);
      }

      if (backupsMatch && method === 'GET') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const name = backupsMatch[1];
        const d = getDeployment(name);
        if (!d || d.username !== auth.username) return error(res, 'Not found', 404);

        const dbBackups = getBackups(name);
        const volumeSize = getVolumeSize(name);

        return json(res, { backups: dbBackups, volumeSize });
      }

      // Restore backup
      const restoreMatch = path.match(/^\/api\/deployments\/([^/]+)\/backups\/([^/]+)\/restore$/);
      if (restoreMatch && method === 'POST') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const name = restoreMatch[1];
        const filename = decodeURIComponent(restoreMatch[2]);
        const d = getDeployment(name);
        if (!d || d.username !== auth.username) return error(res, 'Not found', 404);

        restoreBackup(name, filename);

        // Restart container to pick up restored data
        restartContainer(name);

        addDeployEvent(name, { action: 'restore', username: auth.username });
        return json(res, { message: 'Backup restored and container restarted' });
      }

      // Delete backup
      const deleteBackupMatch = path.match(/^\/api\/deployments\/([^/]+)\/backups\/([^/]+)$/);
      if (deleteBackupMatch && method === 'DELETE') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const name = deleteBackupMatch[1];
        const filename = decodeURIComponent(deleteBackupMatch[2]);
        const d = getDeployment(name);
        if (!d || d.username !== auth.username) return error(res, 'Not found', 404);

        deleteBackupFile(name, filename);
        deleteBackupRecord(name, filename);

        return json(res, { message: 'Backup deleted' });
      }

      // ── Build Logs ─────────────────────────────────────────────────────

      const buildLogsMatch = path.match(/^\/api\/deployments\/([^/]+)\/build-logs$/);
      if (buildLogsMatch && method === 'GET') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const name = buildLogsMatch[1];
        const d = getDeployment(name);
        if (!d || d.username !== auth.username) return error(res, 'Not found', 404);

        const logs = getBuildLogs(name);
        return json(res, { logs });
      }

      // ── Not an API route — pass to next middleware ─────────────────────
      next();
    } catch (err: unknown) {
      console.error(err);
      error(res, (err as Error).message || 'Internal server error', 500);
    }
  };
}
