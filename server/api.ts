import {
  appendFileSync,
  mkdirSync,
  existsSync,
  copyFileSync,
  createReadStream,
  createWriteStream,
  readdirSync,
  statSync,
} from 'node:fs';
import { totalmem, cpus } from 'node:os';
import { rename, rm } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createConnection, isIP } from 'node:net';
import { request as httpRequest, type IncomingMessage, type ServerResponse } from 'node:http';
import Busboy from 'busboy';
import { startMetricsCollector } from './metrics-collector.ts';
import {
  claimAgentExecSession,
  closeAgentExecSession,
  pollAgentExecSession,
  writeAgentExecOutput,
} from './agent-exec.ts';
import { createHotPathHandler } from './edge/proxy.ts';
import { getCaCertBuffer, certsExist, ensureCertCoversHost } from './certs.ts';

import {
  registerUser,
  loginUser,
  authenticate,
  logoutUser,
  getUser,
  changePassword,
  saveDeployment,
  registerDeploymentStart,
  getDeployment,
  getDeployments,
  deleteDeployment,
  updateDeploymentSettings,
  updateDeploymentStatus,
  recordContainerStart,
  getDiscoverableDeployments,
  getUploadsDir,
  addDeployEvent,
  getDeployHistory,
  logRequest,
  getRequestLogs,
  getRequestSummary,
  getCurrentHealth,
  getDashboardAggregate,
  getRequestSeries,
  getTopErrorPaths,
  saveBackup,
  getBackups,
  deleteBackupRecord,
  createBuildLog,
  buildLogFilePath,
  completeBuildLog,
  getBuildLogs,
  getActiveBuildLog,
  saveRuntimeLogs,
  updateCurrentBuildLogId,
  getDeploymentEnvVars,
  getDeploymentVolumes,
  getAllocatedMemory,
  getAllDeployments,
  isAdmin,
  createNodeEnrollment,
  redeemNodeEnrollment,
  authenticateNode,
  heartbeatNode,
  revokeNode,
  setDefaultNode,
  getFleetPlacementState,
  claimAgentJob,
  getAgentJob,
  getRecentAgentJobs,
  reconcileNodeRuntimePorts,
  completeAgentJob,
  setDeploymentDesiredNode,
  enqueueAgentJob,
  getNode,
} from './store.ts';
import { emit } from './events.ts';
import { notifyCertReload } from './ipc.ts';
import { forgetApp as forgetCrashTracker } from './crash-tracker.ts';
import {
  classifyProject,
  ensureDockerfile,
  buildImage,
  runContainer,
  removeContainer,
  removeContainerByName,
  renameContainerByName,
  containerExists,
  healthCheckPort,
  prunePreviousContainers,
  stopContainerByName,
  getContainerStatusAsync,
  getAllContainerStatuses,
  getDeploymentContainerStatuses,
  captureContainerLogsAsync,
  streamLogs,
  getAvailablePort,
  getContainerInspectAsync,
  getContainerStats,
  restartContainer,
  recreateContainer,
  parseMemoryLimit,
  validateVolumeMounts,
  startDockerEventStream,
} from './docker.ts';
import {
  getVolumeDir,
  createBackup,
  restoreBackup,
  deleteBackupFile,
  deleteVolumes,
  getVolumeSize,
  getBackupDir,
} from './volumes.ts';
import { readDeployConfig } from './deploy-config.ts';
import {
  acquireDeploySlot,
  getDeployAdmissionState,
  cancelQueuedDeploy,
  type DeployLease,
} from './deploy-admission.ts';

// Pre-container states where Docker has no container yet
const PRE_CONTAINER_STATES = new Set([
  'uploading',
  'backing-up',
  'building',
  'restoring',
  'starting',
]);
const MIGRATION_STATES = new Set(['backing-up', 'restoring']);
const MIGRATION_TIMEOUT_MS = 30 * 60 * 1000;
const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
interface MigrationProgress {
  phase: 'backing-up' | 'restoring';
  stage: 'compressing' | 'transferring' | 'extracting';
  processedBytes: number;
  totalBytes: number;
  updatedAt: number;
}
const migrationProgressByDeployment = new Map<string, MigrationProgress>();
interface AgentJobActivity {
  stage: string;
  processedBytes: number;
  totalBytes: number;
  updatedAt: number;
  logs: Array<{ timestamp: number; message: string }>;
}
const agentActivityByJob = new Map<string, AgentJobActivity>();
const agentJobsWithStreamedBuildOutput = new Set<string>();

function reportMigrationProgress(
  deploymentName: string,
  progress: Omit<MigrationProgress, 'updatedAt'>,
) {
  const snapshot = { ...progress, updatedAt: Date.now() };
  migrationProgressByDeployment.set(deploymentName, snapshot);
  emit({
    type: 'deployment:migration-progress',
    deploymentName,
    data: snapshot,
  });
}

function updateAgentActivity(
  jobId: string,
  update: Partial<Omit<AgentJobActivity, 'logs'>>,
  message?: string,
) {
  const current = agentActivityByJob.get(jobId) || {
    stage: 'queued',
    processedBytes: 0,
    totalBytes: 0,
    updatedAt: Date.now(),
    logs: [],
  };
  const logs = message
    ? [...current.logs, { timestamp: Date.now(), message }].slice(-20)
    : current.logs;
  agentActivityByJob.set(jobId, {
    ...current,
    ...update,
    updatedAt: Date.now(),
    logs,
  });
}

/** Async resolve status — avoids blocking the event loop during HTTP request handling. */
async function resolveStatusAsync(d: {
  name: string;
  status: string | null;
  updatedAt?: string | null;
  activeNodeId?: string | null;
}): Promise<string> {
  if (d.activeNodeId && d.activeNodeId !== 'coordinator') {
    const node = getNode(d.activeNodeId);
    return node?.online ? d.status || 'unknown' : 'node-offline';
  }
  if (d.status && PRE_CONTAINER_STATES.has(d.status)) {
    if (d.updatedAt) {
      const elapsed = Date.now() - new Date(d.updatedAt).getTime();
      if (elapsed > STALE_THRESHOLD_MS) {
        updateDeploymentStatus(d.name, 'unknown');
        return getContainerStatusAsync(d.name);
      }
    }
    return d.status;
  }
  return getContainerStatusAsync(d.name);
}

/** Batch-resolve status using a pre-fetched status map (avoids N docker inspect calls) */
function resolveStatusBatched(
  d: {
    name: string;
    status: string | null;
    updatedAt?: string | null;
    activeNodeId?: string | null;
  },
  statusMap: Map<string, string>,
): string {
  if (d.activeNodeId && d.activeNodeId !== 'coordinator') {
    const node = getNode(d.activeNodeId);
    return node?.online ? d.status || 'unknown' : 'node-offline';
  }
  if (d.status && PRE_CONTAINER_STATES.has(d.status)) {
    if (d.updatedAt) {
      const elapsed = Date.now() - new Date(d.updatedAt).getTime();
      if (elapsed > STALE_THRESHOLD_MS) {
        updateDeploymentStatus(d.name, 'unknown');
        return statusMap.get(d.name.toLowerCase()) || 'stopped';
      }
    }
    return d.status;
  }
  return statusMap.get(d.name.toLowerCase()) || 'stopped';
}

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
  if (res.writableEnded || res.destroyed) return;
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

// ── Auth ────────────────────────────────────────────────────────────────────
// Supports two transport methods (no behavioral difference, just where the
// secret lives):
//   - Cookie `deploy-sh-auth` set by /api/login — used by the browser so server
//     components can read it via getRequest() on initial render, skipping the
//     usual __action round-trip to fetch dashboard data.
//   - X-Deploy-Username / X-Deploy-Token headers — used by the CLI and by
//     existing client-side `'use server'` calls that pass auth explicitly.
const AUTH_COOKIE = 'deploy-sh-auth';

function parseAuthCookie(req: IncomingMessage): { username?: string; token?: string } {
  const raw = req.headers.cookie;
  if (!raw) return {};
  for (const part of raw.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === AUTH_COOKIE) {
      const value = rest.join('=');
      try {
        const decoded = decodeURIComponent(value);
        const sep = decoded.indexOf(':');
        if (sep === -1) return {};
        return { username: decoded.slice(0, sep), token: decoded.slice(sep + 1) };
      } catch {
        return {};
      }
    }
  }
  return {};
}

function getAuth(req: IncomingMessage) {
  const username = (req.headers['x-deploy-username'] as string | undefined) ?? undefined;
  const token = (req.headers['x-deploy-token'] as string | undefined) ?? undefined;
  if (username && token) return { username, token };
  return parseAuthCookie(req);
}

function buildAuthCookie(username: string, token: string): string {
  // 30 day TTL; httpOnly so JS can't read it (XSS-resistant); SameSite=Lax so
  // cookie still flows on top-level navigation. Secure flag is set because we
  // only serve over HTTPS (HTTP redirects to HTTPS).
  const value = encodeURIComponent(`${username}:${token}`);
  return `${AUTH_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${60 * 60 * 24 * 30}`;
}

function clearAuthCookie(): string {
  return `${AUTH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`;
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

function requireAdmin(
  req: IncomingMessage,
  res: ServerResponse,
): { username: string; token: string } | null {
  const auth = requireAuth(req, res);
  if (!auth) return null;
  if (!isAdmin(auth.username)) {
    error(res, 'Administrator access required', 403);
    return null;
  }
  return auth;
}

function remoteAddress(req: IncomingMessage): string | undefined {
  return req.socket.remoteAddress?.replace(/^::ffff:/, '');
}

function latestRetainedArtifact(deploymentName: string): string | null {
  const artifactDir = resolve(getUploadsDir(), '..', 'artifacts', deploymentName);
  if (!existsSync(artifactDir)) return null;
  const latest = readdirSync(artifactDir)
    .filter((filename) => filename.endsWith('.tar.gz'))
    .map((filename) => {
      const path = resolve(artifactDir, filename);
      return { path, modifiedAt: statSync(path).mtimeMs };
    })
    .sort((a, b) => b.modifiedAt - a.modifiedAt)[0];
  return latest?.path || null;
}

function submitRetainedArtifact(
  artifactPath: string,
  deploymentName: string,
  auth: { username: string; token: string },
): Promise<Record<string, unknown>> {
  const boundary = `----deploy-local-relocate-${Date.now().toString(36)}`;
  const prefix = Buffer.from(
    [
      `--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\n${deploymentName}\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="detached"\r\n\r\n1\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="source.tar.gz"\r\n`,
      'Content-Type: application/gzip\r\n\r\n',
    ].join(''),
  );
  const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
  const contentLength = prefix.length + statSync(artifactPath).size + suffix.length;

  return new Promise((resolvePromise, rejectPromise) => {
    const request = httpRequest(
      {
        hostname: '127.0.0.1',
        port: Number(process.env.PORT || 80),
        path: '/api/upload',
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': contentLength,
          'x-deploy-username': auth.username,
          'x-deploy-token': auth.token,
          'user-agent': 'deploy.local-relocation',
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => {
          const raw = Buffer.concat(chunks).toString();
          let body: Record<string, unknown> = {};
          try {
            body = JSON.parse(raw) as Record<string, unknown>;
          } catch {
            // retain the HTTP error below
          }
          if ((response.statusCode || 500) >= 400) {
            rejectPromise(
              new Error(String(body.error || raw || `Relocation failed (${response.statusCode})`)),
            );
            return;
          }
          resolvePromise(body);
        });
      },
    );
    request.on('error', rejectPromise);
    request.write(prefix);
    const artifact = createReadStream(artifactPath);
    artifact.on('error', rejectPromise);
    artifact.on('end', () => request.end(suffix));
    artifact.pipe(request, { end: false });
  });
}

async function dispatchAgentCommand(
  nodeId: string,
  type: string,
  deploymentName: string,
  payload: Record<string, unknown> = {},
  timeoutMs = 120_000,
  artifactPath?: string,
) {
  const node = getNode(nodeId);
  if (!node || !node.online) throw new Error('Deployment node is offline');
  const queued = enqueueAgentJob({
    nodeId,
    type,
    deploymentName,
    payload,
    artifactPath,
  });
  const deadline = Date.now() + timeoutMs;
  let job = getAgentJob(queued.id);
  while (job && job.status !== 'complete' && job.status !== 'failed' && Date.now() < deadline) {
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
    job = getAgentJob(queued.id);
  }
  if (!job || (job.status !== 'complete' && job.status !== 'failed')) {
    throw new Error(`Timed out waiting for ${node.name}`);
  }
  if (job.status === 'failed') throw new Error(job.error || `Remote ${type} failed`);
  return job.result ? (JSON.parse(job.result) as Record<string, unknown>) : {};
}

function waitForRemotePort(host: string, port: number, timeoutMs = 10_000): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const deadline = Date.now() + timeoutMs;
    const attempt = () => {
      const socket = createConnection({ host, port });
      let settled = false;
      const finishAttempt = (connected: boolean) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        if (connected) {
          resolvePromise(true);
        } else if (Date.now() >= deadline) {
          resolvePromise(false);
        } else {
          setTimeout(attempt, 250);
        }
      };
      socket.once('connect', () => finishAttempt(true));
      socket.once('error', () => finishAttempt(false));
      socket.setTimeout(1_000, () => finishAttempt(false));
    };
    attempt();
  });
}

// ── Reverse proxy hot path ──────────────────────────────────────────────────
// Lives in edge/proxy.ts (shared with the edge process). In single-process
// mode the entry swaps the route source to the edge RouteTable (which also
// sees mutations made from RSC action worker threads via IPC); the store
// cache is the fallback. In split mode app traffic never reaches this
// process, so the hot path simply never matches.

let _routeSource: (appName: string) => { name: string; port: number | null } | null = (appName) =>
  getDeployment(appName);

export function setHotPathRouteSource(fn: typeof _routeSource) {
  _routeSource = fn;
}

const hotPath = createHotPathHandler({
  getRoute: (appName) => _routeSource(appName),
  logRequest,
  emitEvent: emit,
});

// ── Middleware ───────────────────────────────────────────────────────────────

type NextFn = () => void;

export function apiMiddleware() {
  startMetricsCollector();
  // Single long-lived `docker events` subscriber keeps the container-status
  // cache warm without per-request polling. Auto-reconnects if docker daemon
  // restarts.
  startDockerEventStream();
  return async (req: IncomingMessage, res: ServerResponse, next: NextFn) => {
    // ── Hot-path: mDNS proxy for <name>.local (edge/proxy.ts) ──
    if (hotPath(req, res)) return;

    // ── Non-proxy paths: parse URL and continue with the slow path ──
    const rawUrl = req.url!;
    const method = req.method;
    const hostHeader =
      req.headers.host || (req.headers[':authority'] as string | undefined) || 'deploy.local';
    const colonIdx = hostHeader.indexOf(':');
    const hostname = colonIdx === -1 ? hostHeader : hostHeader.substring(0, colonIdx);
    const url = new URL(rawUrl, `http://${hostHeader}`);
    const path = url.pathname;

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

    // Serve CA certificate for trust installation (works on any host)
    if (path === '/ca.crt' && method === 'GET' && certsExist()) {
      const caCert = getCaCertBuffer();
      res.writeHead(200, {
        'Content-Type': 'application/x-x509-ca-cert',
        'Content-Disposition': 'attachment; filename="deploy-sh-ca.crt"',
        'Content-Length': caCert.length,
      });
      res.end(caCert);
      return;
    }

    // ── discover.local — redirect root to /discover ─────────────────────
    if (hostname === 'discover.local' && (path === '/' || path === '')) {
      res.writeHead(302, { Location: '/discover' });
      res.end();
      return;
    }

    try {
      // ── Public discover API ──────────────────────────────────────────────

      if (path === '/api/discover' && method === 'GET') {
        const allDeps = getDiscoverableDeployments();
        const statusMap = await getAllContainerStatuses();
        const apps = allDeps.map((d) => ({
          name: d.name,
          type: d.type,
          status: resolveStatusBatched(d, statusMap),
        }));
        return json(res, apps);
      }

      if (path === '/api/system/memory' && method === 'GET') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const systemBytes = totalmem();
        const { totalBytes, perDeployment } = getAllocatedMemory();
        return json(res, {
          system: {
            totalBytes: systemBytes,
            allocatedBytes: totalBytes,
            availableBytes: Math.max(0, systemBytes - totalBytes),
          },
          deployments: perDeployment,
        });
      }

      // ── Auth routes ───────────────────────────────────────────────────────

      if (path === '/api/register' && method === 'POST') {
        const body = JSON.parse((await readBody(req)).toString());
        if (!body.username || !body.password) {
          return error(res, 'Username and password required');
        }
        const result = registerUser(body.username as string, body.password as string);
        if ('error' in result) return error(res, result.error!, result.status!);
        // Set cookie so subsequent navigations can pre-render with auth context
        // (server components can read it via getRequest()).
        res.setHeader('Set-Cookie', buildAuthCookie(body.username as string, result.token));
        return json(res, { token: result.token }, 201);
      }

      if (path === '/api/login' && method === 'POST') {
        const body = JSON.parse((await readBody(req)).toString());
        if (!body.username || !body.password) {
          return error(res, 'Username and password required');
        }
        const result = loginUser(body.username as string, body.password as string);
        if ('error' in result) return error(res, result.error!, result.status!);
        res.setHeader('Set-Cookie', buildAuthCookie(body.username as string, result.token));
        return json(res, { token: result.token });
      }

      if (path === '/api/logout' && method === 'GET') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        logoutUser(auth.username, auth.token);
        res.setHeader('Set-Cookie', clearAuthCookie());
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

      // ── Fleet enrollment and node administration ───────────────────────

      if (path === '/api/agent/enroll' && method === 'POST') {
        const body = JSON.parse((await readBody(req)).toString());
        if (!body.code) return error(res, 'Enrollment code required');
        const result = redeemNodeEnrollment({
          code: String(body.code),
          name: typeof body.name === 'string' ? body.name : undefined,
          platform: typeof body.platform === 'string' ? body.platform : undefined,
          architecture: typeof body.architecture === 'string' ? body.architecture : undefined,
          agentVersion: typeof body.agentVersion === 'string' ? body.agentVersion : undefined,
          address: remoteAddress(req),
          capabilities:
            body.capabilities && typeof body.capabilities === 'object'
              ? body.capabilities
              : undefined,
        });
        if ('error' in result && result.error) return error(res, result.error, 400);
        return json(res, result, 201);
      }

      if (path === '/api/agent/heartbeat' && method === 'POST') {
        const nodeId = req.headers['x-deploy-node-id'] as string | undefined;
        const secret = req.headers['x-deploy-node-secret'] as string | undefined;
        if (!authenticateNode(nodeId, secret)) return error(res, 'Invalid node credential', 401);
        const body = JSON.parse((await readBody(req)).toString() || '{}');
        const advertisedAddress =
          typeof body.address === 'string' && isIP(body.address) === 4
            ? body.address
            : remoteAddress(req);
        const node = heartbeatNode(nodeId!, {
          platform: typeof body.platform === 'string' ? body.platform : undefined,
          architecture: typeof body.architecture === 'string' ? body.architecture : undefined,
          agentVersion: typeof body.agentVersion === 'string' ? body.agentVersion : undefined,
          address: advertisedAddress,
          capabilities:
            body.capabilities && typeof body.capabilities === 'object'
              ? body.capabilities
              : undefined,
        });
        if (Array.isArray(body.capabilities?.apps)) {
          reconcileNodeRuntimePorts(nodeId!, body.capabilities.apps);
        }
        return json(res, { ok: true, node });
      }

      if (path === '/api/agent/jobs/claim' && method === 'POST') {
        const nodeId = req.headers['x-deploy-node-id'] as string | undefined;
        const secret = req.headers['x-deploy-node-secret'] as string | undefined;
        if (!authenticateNode(nodeId, secret)) return error(res, 'Invalid node credential', 401);
        const job = claimAgentJob(nodeId!);
        if (!job) {
          res.writeHead(204);
          res.end();
          return;
        }
        updateAgentActivity(
          job.id,
          { stage: 'starting' },
          `Started ${job.type} for ${job.deploymentName}`,
        );
        return json(res, {
          id: job.id,
          type: job.type,
          deploymentName: job.deploymentName,
          payload: JSON.parse(job.payload),
          artifactUrl: job.artifactPath ? `/api/agent/jobs/${job.id}/artifact` : null,
        });
      }

      if (path === '/api/agent/exec/claim' && method === 'POST') {
        const nodeId = req.headers['x-deploy-node-id'] as string | undefined;
        const secret = req.headers['x-deploy-node-secret'] as string | undefined;
        if (!authenticateNode(nodeId, secret)) return error(res, 'Invalid node credential', 401);
        const session = claimAgentExecSession(nodeId!);
        if (!session) {
          res.writeHead(204);
          res.end();
          return;
        }
        return json(res, session);
      }

      const agentExecPollMatch = path.match(/^\/api\/agent\/exec\/([^/]+)\/poll$/);
      if (agentExecPollMatch && method === 'POST') {
        const nodeId = req.headers['x-deploy-node-id'] as string | undefined;
        const secret = req.headers['x-deploy-node-secret'] as string | undefined;
        if (!authenticateNode(nodeId, secret)) return error(res, 'Invalid node credential', 401);
        const control = pollAgentExecSession(agentExecPollMatch[1], nodeId!);
        if (!control) return error(res, 'Terminal session not found', 404);
        return json(res, control);
      }

      const agentExecOutputMatch = path.match(/^\/api\/agent\/exec\/([^/]+)\/output$/);
      if (agentExecOutputMatch && method === 'POST') {
        const nodeId = req.headers['x-deploy-node-id'] as string | undefined;
        const secret = req.headers['x-deploy-node-secret'] as string | undefined;
        if (!authenticateNode(nodeId, secret)) return error(res, 'Invalid node credential', 401);
        const body = JSON.parse((await readBody(req)).toString() || '{}');
        if (
          !writeAgentExecOutput(
            agentExecOutputMatch[1],
            nodeId!,
            typeof body.output === 'string' ? body.output : '',
          )
        ) {
          return error(res, 'Terminal session not found', 404);
        }
        return json(res, { ok: true });
      }

      const agentExecExitMatch = path.match(/^\/api\/agent\/exec\/([^/]+)\/exit$/);
      if (agentExecExitMatch && method === 'POST') {
        const nodeId = req.headers['x-deploy-node-id'] as string | undefined;
        const secret = req.headers['x-deploy-node-secret'] as string | undefined;
        if (!authenticateNode(nodeId, secret)) return error(res, 'Invalid node credential', 401);
        const body = JSON.parse((await readBody(req)).toString() || '{}');
        closeAgentExecSession(agentExecExitMatch[1], nodeId!, {
          code: Number.isInteger(body.code) ? body.code : null,
          error: typeof body.error === 'string' ? body.error : undefined,
        });
        return json(res, { ok: true });
      }

      const agentJobArtifactMatch = path.match(/^\/api\/agent\/jobs\/([^/]+)\/artifact$/);
      if (agentJobArtifactMatch && method === 'GET') {
        const nodeId = req.headers['x-deploy-node-id'] as string | undefined;
        const secret = req.headers['x-deploy-node-secret'] as string | undefined;
        if (!authenticateNode(nodeId, secret)) return error(res, 'Invalid node credential', 401);
        const job = getAgentJob(agentJobArtifactMatch[1]);
        if (!job || job.nodeId !== nodeId || !job.artifactPath || !existsSync(job.artifactPath)) {
          return error(res, 'Artifact not found', 404);
        }
        const stat = statSync(job.artifactPath);
        const rangeHeader = req.headers.range;
        const rangeMatch =
          typeof rangeHeader === 'string' ? rangeHeader.match(/^bytes=(\d+)-$/) : null;
        const startByte = rangeMatch ? Number(rangeMatch[1]) : 0;
        if (!Number.isSafeInteger(startByte) || startByte < 0 || startByte >= stat.size) {
          res.writeHead(416, {
            'Content-Range': `bytes */${stat.size}`,
            'Accept-Ranges': 'bytes',
          });
          res.end();
          return;
        }
        const partial = startByte > 0;
        res.writeHead(partial ? 206 : 200, {
          'Content-Type': 'application/gzip',
          'Content-Length': stat.size - startByte,
          'Accept-Ranges': 'bytes',
          ...(partial
            ? { 'Content-Range': `bytes ${startByte}-${stat.size - 1}/${stat.size}` }
            : {}),
        });
        const artifactStream = createReadStream(job.artifactPath, { start: startByte });
        if (job.type === 'restore') {
          let processedBytes = startByte;
          let lastReportedAt = 0;
          const report = (force = false) => {
            const now = Date.now();
            if (!force && now - lastReportedAt < 500) return;
            lastReportedAt = now;
            reportMigrationProgress(job.deploymentName, {
              phase: 'restoring',
              stage: 'transferring',
              processedBytes,
              totalBytes: stat.size,
            });
            updateAgentActivity(job.id, {
              stage: 'downloading backup',
              processedBytes,
              totalBytes: stat.size,
            });
          };
          artifactStream.on('data', (chunk) => {
            processedBytes += chunk.length;
            report();
          });
          artifactStream.on('end', () => {
            report(true);
            reportMigrationProgress(job.deploymentName, {
              phase: 'restoring',
              stage: 'extracting',
              processedBytes: stat.size,
              totalBytes: stat.size,
            });
            updateAgentActivity(
              job.id,
              {
                stage: 'extracting backup',
                processedBytes: 0,
                totalBytes: stat.size,
              },
              'Backup download complete; extracting archive',
            );
          });
        } else if (job.type === 'deploy') {
          let processedBytes = startByte;
          let lastReportedAt = 0;
          const report = (force = false) => {
            const now = Date.now();
            if (!force && now - lastReportedAt < 500) return;
            lastReportedAt = now;
            updateAgentActivity(job.id, {
              stage: 'downloading source',
              processedBytes,
              totalBytes: stat.size,
            });
          };
          artifactStream.on('data', (chunk) => {
            processedBytes += chunk.length;
            report();
          });
          artifactStream.on('end', () => {
            report(true);
            updateAgentActivity(
              job.id,
              {
                stage: 'unpacking source',
                processedBytes: stat.size,
                totalBytes: stat.size,
              },
              'Source download complete; unpacking application',
            );
          });
        }
        artifactStream.pipe(res);
        return;
      }

      const agentJobCompleteMatch = path.match(/^\/api\/agent\/jobs\/([^/]+)\/complete$/);
      if (agentJobCompleteMatch && method === 'POST') {
        const nodeId = req.headers['x-deploy-node-id'] as string | undefined;
        const secret = req.headers['x-deploy-node-secret'] as string | undefined;
        if (!authenticateNode(nodeId, secret)) return error(res, 'Invalid node credential', 401);
        const body = JSON.parse((await readBody(req)).toString());
        try {
          completeAgentJob(agentJobCompleteMatch[1], nodeId!, {
            success: body.success === true,
            result: body.result && typeof body.result === 'object' ? body.result : undefined,
            error: typeof body.error === 'string' ? body.error : undefined,
          });
          updateAgentActivity(
            agentJobCompleteMatch[1],
            { stage: body.success === true ? 'complete' : 'failed' },
            body.success === true
              ? 'Job completed'
              : `Job failed: ${typeof body.error === 'string' ? body.error : 'unknown error'}`,
          );
          return json(res, { ok: true });
        } catch (err) {
          return error(res, (err as Error).message, 404);
        }
      }

      const agentJobProgressMatch = path.match(/^\/api\/agent\/jobs\/([^/]+)\/progress$/);
      if (agentJobProgressMatch && method === 'POST') {
        const nodeId = req.headers['x-deploy-node-id'] as string | undefined;
        const secret = req.headers['x-deploy-node-secret'] as string | undefined;
        if (!authenticateNode(nodeId, secret)) return error(res, 'Invalid node credential', 401);
        const job = getAgentJob(agentJobProgressMatch[1]);
        if (!job || job.nodeId !== nodeId) return error(res, 'Job not found', 404);
        const body = JSON.parse((await readBody(req)).toString() || '{}');
        const processedBytes = Math.max(0, Number(body.processedBytes || 0));
        const totalBytes = Math.max(0, Number(body.totalBytes || 0));
        const stage = String(body.stage || 'working').slice(0, 80);
        updateAgentActivity(
          job.id,
          { stage, processedBytes, totalBytes },
          typeof body.message === 'string' ? body.message.slice(0, 500) : undefined,
        );
        const buildOutput =
          job.type === 'deploy' && typeof body.output === 'string'
            ? body.output.slice(0, 512 * 1024)
            : '';
        if (buildOutput) {
          const payload = JSON.parse(job.payload) as { buildLogId?: number };
          const buildLogId = Number(payload.buildLogId);
          if (Number.isSafeInteger(buildLogId) && buildLogId > 0) {
            appendFileSync(buildLogFilePath(buildLogId), buildOutput);
            agentJobsWithStreamedBuildOutput.add(job.id);
            for (const outputLine of buildOutput.split('\n')) {
              if (!outputLine) continue;
              const timestampedLine = outputLine.match(/^\[([^\]]+)]\s?(.*)$/);
              emit({
                type: 'build:output',
                deploymentName: job.deploymentName,
                data: {
                  line: timestampedLine?.[2] ?? outputLine,
                  timestamp: timestampedLine?.[1] ?? new Date().toISOString(),
                },
              });
            }
          }
        }
        if (job.type === 'restore') {
          reportMigrationProgress(job.deploymentName, {
            phase: 'restoring',
            stage: 'extracting',
            processedBytes,
            totalBytes,
          });
        }
        return json(res, { ok: true });
      }

      const agentJobBackupMatch = path.match(/^\/api\/agent\/jobs\/([^/]+)\/backup$/);
      if (agentJobBackupMatch && method === 'PUT') {
        const nodeId = req.headers['x-deploy-node-id'] as string | undefined;
        const secret = req.headers['x-deploy-node-secret'] as string | undefined;
        if (!authenticateNode(nodeId, secret)) return error(res, 'Invalid node credential', 401);
        const job = getAgentJob(agentJobBackupMatch[1]);
        if (!job || job.nodeId !== nodeId || job.type !== 'backup') {
          return error(res, 'Backup job not found', 404);
        }
        const payload = JSON.parse(job.payload) as {
          label?: string;
          createdBy?: string;
          relatedBuildLogId?: number | null;
          auto?: boolean;
        };
        const timestamp = new Date().toISOString();
        const safeTimestamp = timestamp.replace(/[:.]/g, '-');
        const label = String(payload.label || 'scheduled').replace(/[^a-zA-Z0-9-]/g, '_');
        const filename = `${safeTimestamp}-${label}.tar.gz`;
        const backupDir = getBackupDir(job.deploymentName);
        const temporaryPath = resolve(backupDir, `.${job.id}.partial`);
        const finalPath = resolve(backupDir, filename);
        try {
          await new Promise<void>((resolvePromise, rejectPromise) => {
            const output = createWriteStream(temporaryPath, { flags: 'wx' });
            const totalBytes = Number(req.headers['content-length'] || 0);
            let processedBytes = 0;
            let lastReportedAt = 0;
            req.on('data', (chunk: Buffer) => {
              processedBytes += chunk.length;
              const now = Date.now();
              if (now - lastReportedAt < 500 && processedBytes !== totalBytes) return;
              lastReportedAt = now;
              reportMigrationProgress(job.deploymentName, {
                phase: 'backing-up',
                stage: 'transferring',
                processedBytes,
                totalBytes,
              });
              updateAgentActivity(job.id, {
                stage: 'uploading backup',
                processedBytes,
                totalBytes,
              });
            });
            req.pipe(output);
            output.on('finish', resolvePromise);
            output.on('error', rejectPromise);
            req.on('error', rejectPromise);
          });
          await rename(temporaryPath, finalPath);
          const sizeBytes = statSync(finalPath).size;
          saveBackup({
            deploymentName: job.deploymentName,
            filename,
            label,
            sizeBytes,
            createdBy: payload.createdBy || 'agent',
            createdAt: timestamp,
            volumePaths: ['data', 'uploads'],
            relatedBuildLogId: payload.relatedBuildLogId ?? null,
            auto: payload.auto === true,
          });
          return json(res, { filename, sizeBytes, timestamp, volumePaths: ['data', 'uploads'] });
        } catch (err) {
          await rm(temporaryPath, { force: true }).catch(() => {});
          return error(res, `Backup upload failed: ${(err as Error).message}`, 500);
        }
      }

      if (path === '/api/nodes' && method === 'GET') {
        const auth = requireAdmin(req, res);
        if (!auth) return;
        const fleet = getFleetPlacementState();
        const coordinatorApps = await getDeploymentContainerStatuses();
        return json(res, {
          ...fleet,
          nodes: fleet.nodes.map((node) => {
            if (node.kind === 'coordinator') return { ...node, apps: coordinatorApps };
            try {
              const capabilities = JSON.parse(node.capabilities || '{}') as {
                apps?: unknown[];
              };
              return {
                ...node,
                apps: Array.isArray(capabilities.apps) ? capabilities.apps : [],
                jobs: getRecentAgentJobs(node.id).map((job) => ({
                  id: job.id,
                  type: job.type,
                  deploymentName: job.deploymentName,
                  status: job.status,
                  createdAt: job.createdAt,
                  claimedAt: job.claimedAt,
                  completedAt: job.completedAt,
                  error: job.error,
                  activity: agentActivityByJob.get(job.id) || null,
                })),
              };
            } catch {
              return {
                ...node,
                apps: [],
                jobs: getRecentAgentJobs(node.id).map((job) => ({
                  id: job.id,
                  type: job.type,
                  deploymentName: job.deploymentName,
                  status: job.status,
                  createdAt: job.createdAt,
                  claimedAt: job.claimedAt,
                  completedAt: job.completedAt,
                  error: job.error,
                  activity: agentActivityByJob.get(job.id) || null,
                })),
              };
            }
          }),
        });
      }

      if (path === '/api/nodes/enrollment' && method === 'POST') {
        const auth = requireAdmin(req, res);
        if (!auth) return;
        const body = JSON.parse((await readBody(req)).toString());
        try {
          return json(res, createNodeEnrollment(String(body.name || ''), auth.username), 201);
        } catch (err) {
          return error(res, (err as Error).message);
        }
      }

      if (path === '/api/nodes/default' && method === 'PUT') {
        const auth = requireAdmin(req, res);
        if (!auth) return;
        const body = JSON.parse((await readBody(req)).toString());
        try {
          return json(res, { node: setDefaultNode(String(body.nodeId || '')) });
        } catch (err) {
          return error(res, (err as Error).message);
        }
      }

      const nodeMatch = path.match(/^\/api\/nodes\/([^/]+)$/);
      if (nodeMatch && method === 'DELETE') {
        const auth = requireAdmin(req, res);
        if (!auth) return;
        try {
          revokeNode(decodeURIComponent(nodeMatch[1]));
          return json(res, { message: 'Node access revoked' });
        } catch (err) {
          return error(res, (err as Error).message);
        }
      }

      // ── Upload / Deploy ─────────────────────────────────────────────────

      if (path === '/api/upload' && method === 'POST') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const { username } = auth;
        if (!getFleetPlacementState().ready) {
          return error(
            res,
            'Choose a default deployment node in the Nodes dashboard before deploying.',
            428,
          );
        }

        // Stream the multipart body to a temp file on disk, then once parsing
        // is complete and we have both `name` and the file part, untar the
        // temp file into the deployment directory in a single deterministic
        // step.
        //
        // The previous implementation tried to pipe file bytes straight into
        // a `tar -xz` subprocess as they arrived, deferring "ready to extract"
        // until both name and file had been seen. That raced badly: depending
        // on field/file arrival order, `ensureExtractor` could be invoked from
        // both the `field` handler and the `close` handler while the first
        // call was still awaiting `rm(...)`, spawning two tar processes; and
        // `stdin.end()` was reachable only from one branch, so trailing
        // buffered bytes sometimes got dropped when tar exited on archive EOF
        // markers. Buffering to a temp file avoids OOM (no in-memory buffer
        // of a 500 MB upload) and removes the race entirely.
        const contentType = req.headers['content-type'] || '';
        if (!contentType.startsWith('multipart/form-data')) {
          return error(res, 'Expected multipart/form-data');
        }

        const fields: Record<string, string> = {};
        const uploadsDir = getUploadsDir();
        const tmpFile = resolve(
          uploadsDir,
          `.upload-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.tar.gz`,
        );
        let deployDir: string | null = null;
        let fileFinished: Promise<void> | null = null;
        let sawFile = false;
        let deployLease: DeployLease | null = null;
        let artifactPath: string | null = null;
        let clientAborted = false;
        req.once('aborted', () => {
          clientAborted = true;
        });

        try {
          await new Promise<void>((resolveP, rejectP) => {
            const bb = Busboy({
              headers: req.headers as Record<string, string>,
              limits: { files: 1 },
            });

            bb.on('field', (fieldname, val) => {
              fields[fieldname] = val;
            });

            bb.on('file', (_fieldname, fileStream) => {
              sawFile = true;
              const out = createWriteStream(tmpFile, { highWaterMark: 256 * 1024 });
              fileFinished = new Promise<void>((res, rej) => {
                out.on('finish', () => res());
                out.on('error', rej);
                fileStream.on('error', rej);
              });
              fileStream.pipe(out);
            });

            const onClose = async () => {
              if (!sawFile) throw new Error('No file uploaded');
              if (!fields.name) throw new Error('Missing deployment name');
              // Wait for all bytes to flush to disk before invoking tar.
              await fileFinished;

              const name = fields.name.toLowerCase();
              const existingDeployment = getDeployment(name);
              if (existingDeployment?.status && MIGRATION_STATES.has(existingDeployment.status)) {
                throw Object.assign(
                  new Error(
                    `Migration in progress for ${name}. Wait for it to finish before deploying again.`,
                  ),
                  { status: 409 },
                );
              }
              deployLease = await acquireDeploySlot(name, username, (position) => {
                if (position > 0) {
                  emit({
                    type: 'deployment:queued',
                    deploymentName: name,
                    data: { position, username },
                  });
                }
              });
              if (clientAborted) {
                deployLease.release();
                deployLease = null;
                throw new Error('Upload cancelled while waiting for a build slot');
              }
              deployDir = resolve(uploadsDir, name);
              if (existsSync(deployDir)) {
                await rm(deployDir, { recursive: true, force: true });
              }
              mkdirSync(deployDir, { recursive: true });

              await new Promise<void>((res, rej) => {
                const proc = spawn('tar', ['-xzf', tmpFile], {
                  cwd: deployDir!,
                  stdio: ['ignore', 'pipe', 'pipe'],
                });
                proc.on('close', (code) => {
                  if (code === 0) res();
                  else rej(new Error(`tar exited with code ${code}`));
                });
                proc.on('error', rej);
              });

              // The coordinator retains the exact source artifact so a later
              // node move never depends on the previous execution host.
              const artifactDir = resolve(uploadsDir, '..', 'artifacts', name);
              mkdirSync(artifactDir, { recursive: true });
              artifactPath = resolve(artifactDir, `${Date.now()}.tar.gz`);
              copyFileSync(tmpFile, artifactPath);
            };
            bb.on('close', () => {
              onClose().then(
                () => resolveP(),
                (err) => rejectP(err),
              );
            });

            bb.on('error', rejectP);
            req.pipe(bb);
          });
        } catch (uploadErr) {
          (deployLease as DeployLease | null)?.release();
          await rm(tmpFile, { force: true }).catch(() => {});
          const typedUploadError = uploadErr as Error & { status?: number };
          return error(
            res,
            typedUploadError.message || 'Upload failed',
            typedUploadError.status || 400,
          );
        }
        await rm(tmpFile, { force: true }).catch(() => {});

        if (!deployDir) {
          (deployLease as DeployLease | null)?.release();
          return error(res, 'No file uploaded');
        }
        const deploymentDirectory = deployDir;

        const name = (fields.name || 'app').toLowerCase();

        let leaseReleased = false;
        const releaseDeployLease = () => {
          if (leaseReleased) return;
          leaseReleased = true;
          (deployLease as DeployLease | null)?.release();
        };
        const detached = fields.detached === '1' || fields.detached === 'true';
        if (!detached) {
          res.once('finish', releaseDeployLease);
          res.once('close', releaseDeployLease);
        }

        // Read deploy.json config (if present)
        let deployConfig;
        try {
          deployConfig = readDeployConfig(deploymentDirectory);
        } catch (err: any) {
          releaseDeployLease();
          return error(res, err.message);
        }

        // Classify and build
        const type = classifyProject(deploymentDirectory);
        if (!type) {
          releaseDeployLease();
          return error(
            res,
            'Unknown project type. Need a Dockerfile, package.json, or index.html.',
          );
        }

        ensureDockerfile(deploymentDirectory, type);

        // Register the deployment row up front so a brand-new app shows up in the
        // dashboard the moment it starts deploying (and stays visible as `failed`
        // if the build dies). For an existing app this only refreshes type — it
        // leaves the live container's port/id untouched so its route survives the
        // build. Without this, the `uploading`/`building` status updates below are
        // UPDATE-only no-ops for a never-deployed app and it stays invisible.
        const previousBuildLogId = getDeployment(name)?.currentBuildLogId ?? null;
        registerDeploymentStart(name, username, type);

        const deployStartedAtMs = Date.now();
        const orchestrationBuildLogId = createBuildLog(name);
        updateCurrentBuildLogId(name, orchestrationBuildLogId);
        const appendOrchestrationLog = (message: string) => {
          const timestamp = new Date().toISOString();
          appendFileSync(buildLogFilePath(orchestrationBuildLogId), `[${timestamp}] ${message}\n`);
          emit({
            type: 'build:output',
            deploymentName: name,
            data: { line: message, timestamp },
          });
        };
        const ua = (req.headers['user-agent'] as string | undefined) || '';
        const deploySource: 'cli' | 'ui' = /Mozilla|Chrome|Safari|Firefox|Edg/i.test(ua)
          ? 'ui'
          : 'cli';

        // Emit uploading status
        updateDeploymentStatus(name, 'uploading');
        emit({
          type: 'deployment:status',
          deploymentName: name,
          data: { status: 'uploading', username },
        });
        appendOrchestrationLog('Source artifact accepted by the coordinator');

        const executeDeployment = async () => {
          // Cache deployment lookup to avoid redundant DB queries
          const cachedDeployment = getDeployment(name);
          const placement = getFleetPlacementState();
          const targetNodeId = cachedDeployment?.desiredNodeId || placement.defaultNodeId;
          const targetNode = targetNodeId ? getNode(targetNodeId) : null;
          if (!targetNode) {
            throw Object.assign(
              new Error(
                'Choose a default deployment node in the Nodes dashboard before deploying.',
              ),
              { status: 428 },
            );
          }

          const sourceNodeId = cachedDeployment?.activeNodeId || 'coordinator';
          const movingBetweenNodes = Boolean(cachedDeployment) && sourceNodeId !== targetNode.id;
          const coordinatorContainerWasPresent =
            targetNode.id !== 'coordinator' &&
            (await containerExists(`deploy-sh-${name.toLowerCase()}`));
          let relocationBackupFilename: string | null = null;
          let relocationVolumeSizeBytes = 0;

          // A placement change carries managed data with it. First take custody
          // of a source-host snapshot on the coordinator, keeping the old route
          // live until the destination has built and restored successfully.
          if (cachedDeployment && (cachedDeployment.autoBackup || movingBetweenNodes)) {
            appendOrchestrationLog(
              movingBetweenNodes
                ? `Backing up managed volumes on ${sourceNodeId} before moving nodes`
                : `Backing up managed volumes on ${sourceNodeId} before deployment`,
            );
            updateDeploymentStatus(name, 'backing-up');
            emit({
              type: 'deployment:status',
              deploymentName: name,
              data: {
                status: 'backing-up',
                username,
                nodeId: sourceNodeId,
                moving: movingBetweenNodes,
              },
            });
            try {
              let backup: Record<string, unknown>;
              const backupLabel = movingBetweenNodes ? 'pre-move' : 'pre-deploy';
              if (sourceNodeId !== 'coordinator') {
                backup = await dispatchAgentCommand(
                  sourceNodeId,
                  'backup',
                  name,
                  {
                    label: backupLabel,
                    createdBy: username,
                    relatedBuildLogId: previousBuildLogId,
                    auto: cachedDeployment.autoBackup === true,
                  },
                  MIGRATION_TIMEOUT_MS,
                );
              } else {
                const localBackup = await createBackup(name, backupLabel, (progress) => {
                  reportMigrationProgress(name, {
                    phase: 'backing-up',
                    stage: 'compressing',
                    ...progress,
                  });
                });
                saveBackup({
                  deploymentName: name,
                  filename: localBackup.filename,
                  label: backupLabel,
                  sizeBytes: localBackup.sizeBytes,
                  createdBy: username,
                  createdAt: localBackup.timestamp,
                  volumePaths: ['data', 'uploads'],
                  relatedBuildLogId: previousBuildLogId,
                  auto: cachedDeployment.autoBackup === true,
                });
                backup = localBackup;
              }
              if (movingBetweenNodes) {
                relocationBackupFilename = String(backup.filename || '');
                if (!relocationBackupFilename) throw new Error('Backup filename was not returned');
                relocationVolumeSizeBytes = Number(backup.volumeSizeBytes || backup.sizeBytes || 0);
              }
            } catch (backupErr) {
              if (movingBetweenNodes) {
                updateDeploymentStatus(name, 'failed');
                emit({
                  type: 'deployment:status',
                  deploymentName: name,
                  data: { status: 'failed', username, nodeId: sourceNodeId },
                });
                throw Object.assign(
                  new Error(`Unable to move application data: ${(backupErr as Error).message}`),
                  { status: 500 },
                );
              }
              console.error('Auto-backup failed:', backupErr);
            }
          }

          // Finish the managed-volume migration before the destination build.
          // The old container remains live and routed during backup/restore.
          if (relocationBackupFilename) {
            updateDeploymentStatus(name, 'restoring');
            appendOrchestrationLog(`Restoring managed volumes on ${targetNode.name}`);
            emit({
              type: 'deployment:status',
              deploymentName: name,
              data: { status: 'restoring', username, nodeId: targetNode.id },
            });
            if (targetNode.kind === 'agent') {
              await dispatchAgentCommand(
                targetNode.id,
                'restore',
                name,
                { restart: false, totalBytes: relocationVolumeSizeBytes },
                MIGRATION_TIMEOUT_MS,
                resolve(getBackupDir(name), relocationBackupFilename),
              );
            } else {
              const backupPath = resolve(getBackupDir(name), relocationBackupFilename);
              const backupSizeBytes = statSync(backupPath).size;
              reportMigrationProgress(name, {
                phase: 'restoring',
                stage: 'extracting',
                processedBytes: 0,
                totalBytes: backupSizeBytes,
              });
              restoreBackup(name, relocationBackupFilename);
              reportMigrationProgress(name, {
                phase: 'restoring',
                stage: 'extracting',
                processedBytes: backupSizeBytes,
                totalBytes: backupSizeBytes,
              });
            }
            appendOrchestrationLog(`Managed-volume migration to ${targetNode.name} completed`);
          }

          // Remote nodes pull the retained artifact and perform the Docker build
          // locally after migration has completed.
          if (targetNode.kind === 'agent') {
            if (!targetNode.online) {
              throw Object.assign(new Error(`Deployment node "${targetNode.name}" is offline`), {
                status: 503,
              });
            }
            if (!artifactPath) {
              throw Object.assign(new Error('Deployment artifact was not retained'), {
                status: 500,
              });
            }

            updateDeploymentStatus(name, 'building');
            appendOrchestrationLog(`Remote build queued on ${targetNode.name}`);
            emit({
              type: 'deployment:status',
              deploymentName: name,
              data: { status: 'building', username, nodeId: targetNode.id },
            });
            const buildLogId = orchestrationBuildLogId;
            const job = enqueueAgentJob({
              nodeId: targetNode.id,
              type: 'deploy',
              deploymentName: name,
              artifactPath,
              payload: {
                buildLogId,
                noCache: fields.noCache === '1' || fields.noCache === 'true',
                envVars: getDeploymentEnvVars(name),
                memoryLimit: cachedDeployment?.memoryLimit || '4g',
                cpuLimit: cachedDeployment?.cpuLimit || undefined,
                volumes: getDeploymentVolumes(name),
                gpuEnabled: deployConfig.gpus ?? cachedDeployment?.gpuEnabled ?? false,
                privilegedDocker:
                  deployConfig.privilegedDocker ?? cachedDeployment?.privilegedDocker ?? false,
              },
            });

            const deadline = Date.now() + 20 * 60_000;
            let finishedJob = getAgentJob(job.id);
            while (
              finishedJob &&
              finishedJob.status !== 'complete' &&
              finishedJob.status !== 'failed' &&
              Date.now() < deadline
            ) {
              await new Promise((resolvePromise) => setTimeout(resolvePromise, 750));
              finishedJob = getAgentJob(job.id);
            }
            if (
              !finishedJob ||
              (finishedJob.status !== 'complete' && finishedJob.status !== 'failed')
            ) {
              agentJobsWithStreamedBuildOutput.delete(job.id);
              updateDeploymentStatus(name, 'failed');
              throw Object.assign(
                new Error(`Timed out waiting for "${targetNode.name}" to finish the deploy`),
                { status: 504 },
              );
            }

            const streamedBuildOutput = agentJobsWithStreamedBuildOutput.delete(job.id);
            const remoteResult = finishedJob.result ? JSON.parse(finishedJob.result) : {};
            const remoteOutput = String(remoteResult.buildOutput || '');
            if (remoteOutput && !streamedBuildOutput) {
              appendFileSync(buildLogFilePath(buildLogId), remoteOutput);
            }
            const buildDuration = Number(remoteResult.buildDuration || 0);
            emit({
              type: 'build:complete',
              deploymentName: name,
              data: { success: finishedJob.status === 'complete', duration: buildDuration },
            });

            if (finishedJob.status === 'failed') {
              updateDeploymentStatus(name, 'failed');
              appendOrchestrationLog(finishedJob.error || 'Remote build failed');
              emit({
                type: 'deployment:status',
                deploymentName: name,
                data: { status: 'failed', username, nodeId: targetNode.id },
              });
              throw Object.assign(new Error(finishedJob.error || 'Remote build failed'), {
                status: 500,
              });
            }

            const port = Number(remoteResult.port);
            const containerId = String(remoteResult.containerId || '');
            if (
              !targetNode.address ||
              !Number.isInteger(port) ||
              !(await waitForRemotePort(targetNode.address, port))
            ) {
              throw Object.assign(
                new Error(
                  `Application started, but the coordinator cannot reach ${targetNode.name} at ${
                    targetNode.address || 'its reported address'
                  }:${port || 'unknown port'}`,
                ),
                { status: 502 },
              );
            }
            const extraPorts = Array.isArray(remoteResult.extraPorts)
              ? remoteResult.extraPorts
              : [];
            saveDeployment({
              name,
              type: String(remoteResult.type || type),
              username,
              port,
              containerId,
              containerName: String(remoteResult.containerName || ''),
              directory: deploymentDirectory,
              extraPorts: extraPorts.length ? JSON.stringify(extraPorts) : null,
              desiredNodeId: targetNode.id,
              activeNodeId: targetNode.id,
              createdAt: new Date().toISOString(),
            });
            recordContainerStart(name);
            updateDeploymentStatus(name, 'running');
            updateCurrentBuildLogId(name, buildLogId);
            addDeployEvent(name, {
              action: 'deploy',
              username,
              type,
              port,
              containerId,
              buildLogId,
              durationMs: Date.now() - deployStartedAtMs,
              source: deploySource,
            });
            const allNames = getAllDeployments().map((deployment) => deployment.name);
            if (ensureCertCoversHost(name, allNames)) notifyCertReload();
            emit({
              type: 'deployment:status',
              deploymentName: name,
              data: { status: 'running', username, type, port, nodeId: targetNode.id },
            });
            emit({
              type: 'deployment:created',
              deploymentName: name,
              data: { name, type, port, containerId, username, nodeId: targetNode.id },
            });
            if (movingBetweenNodes && cachedDeployment) {
              try {
                if (sourceNodeId === 'coordinator') {
                  await removeContainer(name);
                  appendOrchestrationLog('Previous coordinator containers removed');
                } else {
                  await dispatchAgentCommand(sourceNodeId, 'delete', name, {
                    deleteVolumes: false,
                  });
                  appendOrchestrationLog(`Previous containers removed from ${sourceNodeId}`);
                }
              } catch (cleanupErr) {
                console.warn(`[deploy] Previous node cleanup failed for ${name}:`, cleanupErr);
                appendOrchestrationLog(
                  `Warning: previous node cleanup failed: ${(cleanupErr as Error).message}`,
                );
              }
            }
            if (coordinatorContainerWasPresent && sourceNodeId !== 'coordinator') {
              try {
                await removeContainer(name);
                appendOrchestrationLog('Stray coordinator containers removed');
              } catch (cleanupErr) {
                console.warn(
                  `[deploy] Stray coordinator container cleanup failed for ${name}:`,
                  cleanupErr,
                );
                appendOrchestrationLog(
                  `Warning: stray coordinator cleanup failed: ${(cleanupErr as Error).message}`,
                );
              }
            }
            appendOrchestrationLog(`Deployment completed on ${targetNode.name}`);
            completeBuildLog(buildLogId, {
              success: true,
              duration: Date.now() - deployStartedAtMs,
            });
            return json(
              res,
              { name, type, port, containerId, extraPorts, node: targetNode.name },
              201,
            );
          }

          // Emit building status
          updateDeploymentStatus(name, 'building');
          appendOrchestrationLog('Local Docker build started on the coordinator');
          emit({
            type: 'deployment:status',
            deploymentName: name,
            data: { status: 'building', username },
          });

          console.log(`Building ${name} (${type})...`);
          const buildLogId = orchestrationBuildLogId;
          // Build output goes straight to an append-only file. The old flow
          // accumulated the whole log in a string and rewrote the entire DB
          // column every 2s — O(n²) writes for chatty builds.
          const buildLogStream = createWriteStream(buildLogFilePath(buildLogId), { flags: 'a' });
          const buildStartedMs = Date.now();
          let buildResult: Awaited<ReturnType<typeof buildImage>> | null = null;
          try {
            const noCache = fields.noCache === '1' || fields.noCache === 'true';
            buildResult = await buildImage(
              name,
              deploymentDirectory,
              (line, timestamp) => {
                buildLogStream.write(`[${timestamp}] ${line}\n`);
                emit({ type: 'build:output', deploymentName: name, data: { line, timestamp } });
              },
              { noCache },
            );

            buildLogStream.end();
            emit({
              type: 'build:complete',
              deploymentName: name,
              data: { success: buildResult.success, duration: buildResult.duration },
            });
          } catch (buildErr) {
            // Ensure build log is always marked as failed if an error occurs
            buildLogStream.write(
              `[${new Date().toISOString()}] Build failed due to an internal error\n`,
            );
            buildLogStream.end();
            completeBuildLog(buildLogId, {
              success: false,
              duration: Date.now() - buildStartedMs,
            });
            updateDeploymentStatus(name, 'failed');
            emit({
              type: 'deployment:status',
              deploymentName: name,
              data: { status: 'failed', username },
            });
            throw buildErr;
          }

          // If build failed, return error
          if (!buildResult.success) {
            updateDeploymentStatus(name, 'failed');
            completeBuildLog(buildLogId, {
              success: false,
              duration: Date.now() - deployStartedAtMs,
            });
            emit({
              type: 'deployment:status',
              deploymentName: name,
              data: { status: 'failed', username },
            });
            throw Object.assign(
              new Error(
                `Build failed after ${buildResult.duration}ms. Check build logs for details.`,
              ),
              { status: 500 },
            );
          }

          // Capture runtime logs from the current container before it's replaced
          if (previousBuildLogId) {
            const runtimeLogs = await captureContainerLogsAsync(name);
            if (runtimeLogs) {
              saveRuntimeLogs(previousBuildLogId, runtimeLogs);
            }
          }

          // Emit starting status
          updateDeploymentStatus(name, 'starting');
          emit({
            type: 'deployment:status',
            deploymentName: name,
            data: { status: 'starting', username },
          });

          try {
            const port = await getAvailablePort();
            console.log(`Starting ${name} on port ${port}...`);
            const volumeDir = getVolumeDir(name);
            const storedEnvVars = getDeploymentEnvVars(name);
            const storedVolumes = getDeploymentVolumes(name);
            const memLimit = cachedDeployment?.memoryLimit || '4g';
            const cpuLimit = cachedDeployment?.cpuLimit || undefined;
            const gpuFlag = deployConfig.gpus ?? cachedDeployment?.gpuEnabled ?? false;
            const privilegedDocker =
              deployConfig.privilegedDocker ?? cachedDeployment?.privilegedDocker ?? false;
            // Validate any volumes declared in deploy.json before merging them in
            const declaredVolumes = (deployConfig.volumes || []).map((v) => ({
              hostPath: v.hostPath,
              containerPath: v.containerPath,
              readOnly: v.readOnly,
            }));
            if (declaredVolumes.length > 0) {
              const volErr = validateVolumeMounts(declaredVolumes, { privilegedDocker });
              if (volErr) {
                throw new Error(`deploy.json volumes invalid: ${volErr}`);
              }
            }
            // Merge: stored (UI-set) volumes take precedence, declared volumes are appended
            const mergedVolumes = [
              ...storedVolumes,
              ...declaredVolumes.filter(
                (dv) =>
                  !storedVolumes.some(
                    (sv) => sv.hostPath === dv.hostPath && sv.containerPath === dv.containerPath,
                  ),
              ),
            ];
            // If deploy.json has no ports, preserve existing DB extra ports
            if (!deployConfig.ports?.length && cachedDeployment?.extraPorts) {
              try {
                const parsed = JSON.parse(cachedDeployment.extraPorts) as Array<{
                  container: number;
                  host: number;
                  protocol: string;
                }>;
                deployConfig.ports = parsed.map((p) => ({
                  container: p.container,
                  protocol: p.protocol,
                }));
              } catch {
                // ignore parse errors
              }
            }

            // ── Blue/green orchestration ────────────────────────────────────
            // Old container stays alive on its current port until the new one
            // passes a health check. The reverse proxy points at the port
            // recorded on the deployment row; updating that row at the end is
            // the atomic switchover. The old container is removed after a
            // drain window so in-flight requests can finish; one prior release
            // remains available for an operator-triggered rollback.
            const canonicalName = `deploy-sh-${name.toLowerCase()}`;
            const prevName = `${canonicalName}-prev-${Date.now()}`;
            const hadPrevious = await containerExists(canonicalName);
            if (hadPrevious) {
              try {
                await renameContainerByName(canonicalName, prevName);
                console.log(`[deploy] Renamed ${canonicalName} -> ${prevName} for blue/green swap`);
              } catch (err) {
                console.warn(
                  `[deploy] Failed to rename previous container, falling back to recreate:`,
                  err,
                );
              }
            }

            let runResult;
            try {
              runResult = await runContainer(
                buildResult.tag,
                name,
                port,
                volumeDir,
                deployConfig,
                storedEnvVars,
                memLimit,
                mergedVolumes,
                gpuFlag,
                privilegedDocker,
                cpuLimit,
                undefined,
                {
                  skipExistingRemoval: hadPrevious,
                  sshKeysSourceContainer: hadPrevious ? prevName : undefined,
                },
              );

              // Health-gate the switchover. If the new container never accepts
              // a TCP connection within 30s, treat it as a failed deploy and
              // roll back to the previous container.
              const healthy = await healthCheckPort(port, 30_000);
              if (!healthy) {
                throw new Error(
                  `New container failed health check (port ${port} not accepting connections within 30s)`,
                );
              }
            } catch (rolloutErr) {
              // Rollback: kill the new container if it started, restore the
              // previous one to its canonical name so the proxy keeps working.
              await removeContainerByName(canonicalName);
              if (hadPrevious && (await containerExists(prevName))) {
                try {
                  await renameContainerByName(prevName, canonicalName);
                  console.log(`[deploy] Rolled back: restored ${canonicalName}`);
                } catch (renameErr) {
                  console.error(`[deploy] Rollback rename failed:`, renameErr);
                }
              }
              throw rolloutErr;
            }

            const { id, containerName, extraPorts } = runResult;
            const extraPortsJson = extraPorts.length > 0 ? JSON.stringify(extraPorts) : null;

            saveDeployment({
              name,
              type,
              username,
              port,
              containerId: id,
              containerName,
              directory: deploymentDirectory,
              extraPorts: extraPortsJson,
              desiredNodeId: targetNode.id,
              activeNodeId: targetNode.id,
              createdAt: new Date().toISOString(),
            });
            recordContainerStart(name);

            // Switchover happened above (DB now points at the new container).
            // Retain one previous release for instant rollback. Older retained
            // releases are pruned after the route has switched successfully.
            if (hadPrevious) {
              setTimeout(() => {
                stopContainerByName(prevName)
                  .then(() => prunePreviousContainers(name))
                  .catch((err) =>
                    console.warn(`[deploy] Failed to retain previous release for ${name}:`, err),
                  );
              }, 30_000).unref();
            }

            updateDeploymentStatus(name, 'running');
            updateCurrentBuildLogId(name, buildLogId);

            const deployConfigSettings: {
              discoverable?: boolean;
              gpuEnabled?: boolean;
              privilegedDocker?: boolean;
            } = {};
            if (deployConfig.discoverable !== undefined)
              deployConfigSettings.discoverable = deployConfig.discoverable;
            if (deployConfig.gpus !== undefined)
              deployConfigSettings.gpuEnabled = deployConfig.gpus;
            if (deployConfig.privilegedDocker !== undefined)
              deployConfigSettings.privilegedDocker = deployConfig.privilegedDocker;
            if (Object.keys(deployConfigSettings).length > 0) {
              updateDeploymentSettings(name, deployConfigSettings);
            }

            addDeployEvent(name, {
              action: 'deploy',
              username,
              type,
              port,
              containerId: id,
              buildLogId,
              durationMs: Date.now() - deployStartedAtMs,
              source: deploySource,
            });
            // Regenerate TLS cert if this hostname isn't covered yet; the edge
            // (TLS owner) hot-reloads its secure context on the IPC signal.
            const allNames = getAllDeployments().map((d) => d.name);
            if (ensureCertCoversHost(name, allNames)) {
              notifyCertReload();
            }

            emit({
              type: 'deployment:status',
              deploymentName: name,
              data: { status: 'running', username, type, port },
            });
            emit({
              type: 'deployment:created',
              deploymentName: name,
              data: { name, type, port, containerId: id, username },
            });

            if (movingBetweenNodes && sourceNodeId !== 'coordinator') {
              try {
                await dispatchAgentCommand(sourceNodeId, 'delete', name, {
                  deleteVolumes: false,
                });
              } catch (cleanupErr) {
                console.warn(`[deploy] Previous node cleanup failed for ${name}:`, cleanupErr);
              }
            }

            appendOrchestrationLog('Deployment completed on the coordinator');
            completeBuildLog(buildLogId, {
              success: true,
              duration: Date.now() - deployStartedAtMs,
            });
            console.log(`Deployed ${name} → https://${name}.local`);
            return json(res, { name, type, port, containerId: id, extraPorts }, 201);
          } catch (startErr) {
            // Container start failed — mark deployment as failed
            updateDeploymentStatus(name, 'failed');
            emit({
              type: 'deployment:status',
              deploymentName: name,
              data: { status: 'failed', username },
            });
            throw startErr;
          }
        };

        if (detached) {
          json(
            res,
            {
              accepted: true,
              name,
              buildLogId: orchestrationBuildLogId,
              status: 'uploading',
              dashboardUrl: `/dashboard/${encodeURIComponent(name)}/build`,
            },
            202,
          );
          void executeDeployment()
            .catch((deployErr) => {
              updateDeploymentStatus(name, 'failed');
              appendOrchestrationLog(
                `Deployment failed: ${(deployErr as Error).message || String(deployErr)}`,
              );
              completeBuildLog(orchestrationBuildLogId, {
                success: false,
                duration: Date.now() - deployStartedAtMs,
              });
              emit({
                type: 'deployment:status',
                deploymentName: name,
                data: { status: 'failed', username },
              });
            })
            .finally(releaseDeployLease);
          return;
        }

        try {
          await executeDeployment();
        } catch (deployErr) {
          updateDeploymentStatus(name, 'failed');
          appendOrchestrationLog(
            `Deployment failed: ${(deployErr as Error).message || String(deployErr)}`,
          );
          completeBuildLog(orchestrationBuildLogId, {
            success: false,
            duration: Date.now() - deployStartedAtMs,
          });
          const typedDeployError = deployErr as Error & { status?: number };
          return error(res, typedDeployError.message, typedDeployError.status || 500);
        } finally {
          releaseDeployLease();
        }
        return;
      }

      // ── Deployment management ───────────────────────────────────────────

      if (path === '/api/deployments' && method === 'GET') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const allDeps = getDeployments(auth.username);
        const statusMap = await getAllContainerStatuses();
        const deps = allDeps.map((d) => ({
          ...d,
          status: resolveStatusBatched(d, statusMap),
        }));
        return json(res, deps);
      }

      if (path === '/api/deploy-admission' && method === 'GET') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const placement = getFleetPlacementState();
        return json(res, {
          ...getDeployAdmissionState(auth.username),
          placementReady: placement.ready,
          defaultNode: placement.defaultNode,
          nodes: placement.nodes,
          setupUrl: '/dashboard/nodes',
        });
      }

      const admissionCancelMatch = path.match(/^\/api\/deploy-admission\/([^/]+)$/);
      if (admissionCancelMatch && method === 'GET') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const name = admissionCancelMatch[1].toLowerCase();
        const deployment = getDeployment(name);
        if (deployment && deployment.username !== auth.username) {
          return error(res, 'Not found', 404);
        }
        const migrationActive = Boolean(
          deployment?.status && MIGRATION_STATES.has(deployment.status),
        );
        return json(res, {
          name,
          status: deployment?.status || null,
          migrationActive,
          dashboardUrl: `/dashboard/${encodeURIComponent(name)}/build`,
        });
      }
      if (admissionCancelMatch && method === 'DELETE') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const name = admissionCancelMatch[1].toLowerCase();
        if (!cancelQueuedDeploy(name, auth.username)) {
          return error(res, 'Queued deploy not found', 404);
        }
        return json(res, { message: `Cancelled queued deploy for ${name}` });
      }

      const deploymentNodeMatch = path.match(/^\/api\/deployments\/([^/]+)\/node$/);
      if (deploymentNodeMatch && method === 'POST') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const name = deploymentNodeMatch[1].toLowerCase();
        const deployment = getDeployment(name);
        if (!deployment || deployment.username !== auth.username)
          return error(res, 'Not found', 404);
        if (deployment.status && MIGRATION_STATES.has(deployment.status)) {
          return error(res, 'This application is already moving between nodes', 409);
        }
        const body = JSON.parse((await readBody(req)).toString());
        const nodeId = String(body.nodeId || '');
        const targetNode = getNode(nodeId);
        if (!targetNode || targetNode.revokedAt) return error(res, 'Node not found', 404);
        if (!targetNode.online)
          return error(res, `Deployment node "${targetNode.name}" is offline`, 503);
        const activeNodeId = deployment.activeNodeId || 'coordinator';
        if (activeNodeId === nodeId) {
          return error(res, `${name} is already running on ${targetNode.name}`, 409);
        }
        const artifactPath = latestRetainedArtifact(name);
        if (!artifactPath) {
          return error(
            res,
            'No retained source artifact is available. Run deploy once before using Move now.',
            409,
          );
        }
        try {
          setDeploymentDesiredNode(name, nodeId);
          const accepted = await submitRetainedArtifact(artifactPath, name, auth);
          return json(
            res,
            {
              ...accepted,
              message: `Migration to ${targetNode.name} started`,
              dashboardUrl: `/dashboard/${encodeURIComponent(name)}/build`,
            },
            202,
          );
        } catch (err) {
          return error(res, (err as Error).message, 500);
        }
      }
      if (deploymentNodeMatch && method === 'PUT') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const name = deploymentNodeMatch[1].toLowerCase();
        const deployment = getDeployment(name);
        if (!deployment || deployment.username !== auth.username)
          return error(res, 'Not found', 404);
        const body = JSON.parse((await readBody(req)).toString());
        try {
          const updated = setDeploymentDesiredNode(name, String(body.nodeId || ''));
          return json(res, {
            deployment: updated,
            message:
              updated?.activeNodeId === updated?.desiredNodeId
                ? 'Deployment node unchanged'
                : 'Node selected. The next deployment will move this application.',
          });
        } catch (err) {
          return error(res, (err as Error).message);
        }
      }

      const migrationProgressMatch = path.match(
        /^\/api\/deployments\/([^/]+)\/migration-progress$/,
      );
      if (migrationProgressMatch && method === 'GET') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const name = migrationProgressMatch[1].toLowerCase();
        const deployment = getDeployment(name);
        if (!deployment || deployment.username !== auth.username)
          return error(res, 'Not found', 404);
        return json(res, {
          active: Boolean(deployment.status && MIGRATION_STATES.has(deployment.status)),
          progress: migrationProgressByDeployment.get(name) || null,
        });
      }

      const deploymentMatch = path.match(/^\/api\/deployments\/([^/]+)$/);
      if (deploymentMatch && method === 'GET') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const d = getDeployment(deploymentMatch[1]);
        if (!d || d.username !== auth.username) return error(res, 'Not found', 404);
        const status = await resolveStatusAsync(d);
        return json(res, { ...d, status });
      }

      if (deploymentMatch && method === 'DELETE') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const name = deploymentMatch[1];
        const d = getDeployment(name);
        if (!d || d.username !== auth.username) return error(res, 'Not found', 404);
        if (d.activeNodeId && d.activeNodeId !== 'coordinator') {
          await dispatchAgentCommand(d.activeNodeId, 'delete', name, { deleteVolumes: true });
        } else {
          await removeContainer(name);
          deleteVolumes(name);
        }
        forgetCrashTracker(name);
        addDeployEvent(name, { action: 'delete', username: auth.username, source: 'ui' });
        deleteDeployment(name);
        emit({
          type: 'deployment:deleted',
          deploymentName: name,
          data: { username: auth.username },
        });
        return json(res, { message: `Deleted ${name}` });
      }

      if (deploymentMatch && method === 'PATCH') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const name = deploymentMatch[1];
        const d = getDeployment(name);
        if (!d || d.username !== auth.username) return error(res, 'Not found', 404);

        const body = JSON.parse((await readBody(req)).toString());
        const settings: {
          autoBackup?: boolean;
          discoverable?: boolean;
          envVars?: Record<string, string>;
          memoryLimit?: string;
          cpuLimit?: string;
          volumes?: Array<{ hostPath: string; containerPath: string; readOnly?: boolean }>;
          gpuEnabled?: boolean;
          privilegedDocker?: boolean;
        } = {};
        let extraPortsConfig: Array<{ container: number; protocol?: string }> | undefined;
        if (body.autoBackup !== undefined) settings.autoBackup = body.autoBackup;
        if (body.discoverable !== undefined) settings.discoverable = body.discoverable;
        if (body.gpuEnabled !== undefined) settings.gpuEnabled = !!body.gpuEnabled;
        if (body.privilegedDocker !== undefined)
          settings.privilegedDocker = !!body.privilegedDocker;
        if (body.envVars !== undefined) settings.envVars = body.envVars;
        if (body.memoryLimit !== undefined) {
          const parsed = parseMemoryLimit(body.memoryLimit);
          if (parsed === null)
            return error(
              res,
              'Invalid memory limit format. Use values like "128m", "512m", "1g", "4g".',
              400,
            );
          if (parsed < 128 * 1024 * 1024)
            return error(res, 'Memory limit must be at least 128m', 400);
          if (parsed > totalmem()) return error(res, 'Memory limit exceeds system memory', 400);
          settings.memoryLimit = body.memoryLimit;
        }
        if (body.cpuLimit !== undefined) {
          // Numeric string like "0.5", "2", "4.0" — anything Docker --cpus accepts.
          // We bound it to [0.1, cpu-core-count] to avoid sub-second slices that
          // starve event loop ticks, or values larger than the host can offer.
          const cpuNum = parseFloat(body.cpuLimit);
          if (!Number.isFinite(cpuNum) || cpuNum < 0.1) {
            return error(res, 'cpuLimit must be a number ≥ 0.1', 400);
          }
          if (cpuNum > cpus().length) {
            return error(res, `cpuLimit exceeds available cores (${cpus().length})`, 400);
          }
          settings.cpuLimit = String(cpuNum);
        }
        if (body.volumes !== undefined) {
          if (!Array.isArray(body.volumes)) return error(res, 'volumes must be an array', 400);
          // Use the new privilegedDocker value if it's being changed, else fall back to current
          const effectivePrivilegedDocker =
            body.privilegedDocker !== undefined
              ? !!body.privilegedDocker
              : (d.privilegedDocker ?? false);
          // Host paths belong to the selected execution node. Only validate
          // existence locally when this deployment is assigned locally; the
          // agent performs the same validation before a remote container run.
          if (!d.desiredNodeId || d.desiredNodeId === 'coordinator') {
            const volError = validateVolumeMounts(body.volumes, {
              privilegedDocker: effectivePrivilegedDocker,
            });
            if (volError) return error(res, volError, 400);
          }
          settings.volumes = body.volumes;
        }
        if (body.extraPorts !== undefined) {
          if (!Array.isArray(body.extraPorts))
            return error(res, 'extraPorts must be an array', 400);
          for (let i = 0; i < body.extraPorts.length; i++) {
            const p = body.extraPorts[i];
            if (
              typeof p.container !== 'number' ||
              !Number.isInteger(p.container) ||
              p.container < 1 ||
              p.container > 65535
            )
              return error(
                res,
                `extraPorts[${i}].container must be an integer between 1 and 65535`,
                400,
              );
            if (p.protocol !== undefined && p.protocol !== 'tcp' && p.protocol !== 'udp')
              return error(res, `extraPorts[${i}].protocol must be "tcp" or "udp"`, 400);
          }
          extraPortsConfig = body.extraPorts;
        }
        updateDeploymentSettings(name, settings);

        // If env vars, volumes, GPU, privileged Docker, or extra ports changed, recreate the container so they take effect
        const needsRecreation =
          body.envVars !== undefined ||
          body.volumes !== undefined ||
          body.gpuEnabled !== undefined ||
          body.privilegedDocker !== undefined ||
          body.extraPorts !== undefined;
        if (
          needsRecreation &&
          d.port &&
          d.status === 'running' &&
          (!d.activeNodeId || d.activeNodeId === 'coordinator')
        ) {
          const volumeDir = getVolumeDir(name);
          const memLimit = body.memoryLimit || d.memoryLimit || '4g';
          const envVarsToUse = body.envVars ?? (d.envVars ? JSON.parse(d.envVars) : {});
          const customVolumes = body.volumes ?? getDeploymentVolumes(name);
          const gpuFlag = body.gpuEnabled ?? d.gpuEnabled ?? false;
          const privilegedDockerFlag = body.privilegedDocker ?? d.privilegedDocker ?? false;
          // If user didn't change extraPorts, preserve existing DB ports
          if (extraPortsConfig === undefined && d.extraPorts) {
            try {
              const parsed = JSON.parse(d.extraPorts) as Array<{
                container: number;
                host: number;
                protocol: string;
              }>;
              extraPortsConfig = parsed.map((p) => ({
                container: p.container,
                protocol: p.protocol,
              }));
            } catch {
              // ignore parse errors
            }
          }
          const { id, containerName, extraPorts } = await recreateContainer(
            name,
            d.port,
            volumeDir,
            d.directory,
            envVarsToUse,
            memLimit,
            customVolumes,
            gpuFlag,
            extraPortsConfig,
            privilegedDockerFlag,
          );
          const extraPortsJson = extraPorts.length > 0 ? JSON.stringify(extraPorts) : null;
          saveDeployment({
            name,
            type: d.type || undefined,
            username: d.username,
            port: d.port,
            containerId: id,
            containerName,
            directory: d.directory || undefined,
            extraPorts: extraPortsJson,
          });
          const action =
            body.gpuEnabled !== undefined
              ? 'gpu-update'
              : body.privilegedDocker !== undefined
                ? 'privileged-docker-update'
                : body.volumes !== undefined
                  ? 'volumes-update'
                  : 'env-update';
          addDeployEvent(name, { action, username: auth.username, source: 'ui' });
          emit({
            type: 'deployment:status',
            deploymentName: name,
            data: { status: 'running', username: auth.username },
          });
        }

        return json(res, { message: 'Settings updated' });
      }

      const logsMatch = path.match(/^\/api\/deployments\/([^/]+)\/logs$/);
      if (logsMatch && method === 'GET') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const name = logsMatch[1];
        const d = getDeployment(name);
        if (!d || d.username !== auth.username) return error(res, 'Not found', 404);

        if (d.activeNodeId && d.activeNodeId !== 'coordinator') {
          try {
            const result = await dispatchAgentCommand(d.activeNodeId, 'logs', name);
            res.writeHead(200, {
              'Content-Type': 'text/plain',
              'Access-Control-Allow-Origin': '*',
            });
            res.end(String(result.logs || ''));
          } catch (err) {
            return error(res, (err as Error).message, 502);
          }
          return;
        }

        res.writeHead(200, {
          'Content-Type': 'text/plain',
          'Transfer-Encoding': 'chunked',
          'Access-Control-Allow-Origin': '*',
          // Long-lived stream: tells the edge's forwarding proxy to disable
          // gzip buffering and its idle timeout for this response.
          'X-Accel-Buffering': 'no',
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
        const info = await getContainerInspectAsync(name);
        if (!info) return error(res, 'Container not found', 404);
        info.started = d.containerStartedAt ?? null;
        return json(res, info);
      }

      const statsMatch = path.match(/^\/api\/deployments\/([^/]+)\/stats$/);
      if (statsMatch && method === 'GET') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const name = statsMatch[1];
        const d = getDeployment(name);
        if (!d || d.username !== auth.username) return error(res, 'Not found', 404);
        const stats = await getContainerStats(name);
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
        if (d.activeNodeId && d.activeNodeId !== 'coordinator') {
          await dispatchAgentCommand(d.activeNodeId, 'restart', name);
        } else {
          await restartContainer(name);
        }
        recordContainerStart(name);
        addDeployEvent(name, { action: 'restart', username: auth.username, source: 'ui' });
        updateDeploymentStatus(name, 'running');
        emit({
          type: 'deployment:status',
          deploymentName: name,
          data: { status: 'running', username: auth.username },
        });
        return json(res, { message: `Restarted ${name}` });
      }

      const recreateMatch = path.match(/^\/api\/deployments\/([^/]+)\/recreate$/);
      if (recreateMatch && method === 'POST') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const name = recreateMatch[1];
        const d = getDeployment(name);
        if (!d || d.username !== auth.username) return error(res, 'Not found', 404);
        if (!d.port) return error(res, 'Deployment has no port assigned', 400);

        const volumeDir = getVolumeDir(name);
        const envVars = getDeploymentEnvVars(name);
        const customVolumes = getDeploymentVolumes(name);
        const extraPortsConfig = d.extraPorts ? JSON.parse(d.extraPorts) : undefined;
        const { id, containerName, extraPorts } = await recreateContainer(
          name,
          d.port,
          volumeDir,
          d.directory || null,
          envVars,
          d.memoryLimit || undefined,
          customVolumes,
          d.gpuEnabled || false,
          extraPortsConfig,
          d.privilegedDocker || false,
        );
        saveDeployment({
          name,
          username: auth.username,
          port: d.port,
          containerId: id,
          containerName,
          directory: d.directory || undefined,
          extraPorts: extraPorts.length > 0 ? JSON.stringify(extraPorts) : null,
        });
        addDeployEvent(name, { action: 'recreate', username: auth.username, source: 'ui' });
        updateDeploymentStatus(name, 'running');
        emit({
          type: 'deployment:status',
          deploymentName: name,
          data: { status: 'running', username: auth.username },
        });
        return json(res, { message: `Recreated ${name}` });
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

      // ── Live dashboard data ────────────────────────────────────────────

      // Roll-up of every deployment's current health + load: powers the
      // global dashboard's aggregate strip and per-app cards in a single
      // round-trip. Authed only — no per-app authz needed since the user
      // already sees all their apps on the list anyway.
      if (path === '/api/deployments/aggregate' && method === 'GET') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        return json(res, getDashboardAggregate());
      }

      const healthMatch = path.match(/^\/api\/deployments\/([^/]+)\/health$/);
      if (healthMatch && method === 'GET') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const name = healthMatch[1];
        const d = getDeployment(name);
        if (!d || d.username !== auth.username) return error(res, 'Not found', 404);
        return json(res, getCurrentHealth(name));
      }

      const requestSeriesMatch = path.match(/^\/api\/deployments\/([^/]+)\/requests\/series$/);
      if (requestSeriesMatch && method === 'GET') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const name = requestSeriesMatch[1];
        const d = getDeployment(name);
        if (!d || d.username !== auth.username) return error(res, 'Not found', 404);
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const now = Date.now();
        const fromMs = parseInt(url.searchParams.get('from') || `${now - 3_600_000}`, 10);
        const toMs = parseInt(url.searchParams.get('to') || `${now}`, 10);
        return json(res, getRequestSeries(name, fromMs, toMs));
      }

      const topErrorsMatch = path.match(/^\/api\/deployments\/([^/]+)\/requests\/top-errors$/);
      if (topErrorsMatch && method === 'GET') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const name = topErrorsMatch[1];
        const d = getDeployment(name);
        if (!d || d.username !== auth.username) return error(res, 'Not found', 404);
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const fromMs = parseInt(url.searchParams.get('from') || `${Date.now() - 86_400_000}`, 10);
        const limit = parseInt(url.searchParams.get('limit') || '10', 10);
        return json(res, getTopErrorPaths(name, fromMs, limit));
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

        let result;
        if (d.activeNodeId && d.activeNodeId !== 'coordinator') {
          result = await dispatchAgentCommand(
            d.activeNodeId,
            'backup',
            name,
            {
              label: label || 'manual',
              createdBy: auth.username,
              relatedBuildLogId: d.currentBuildLogId ?? null,
              auto: false,
            },
            10 * 60_000,
          );
        } else {
          result = await createBackup(name, label);
          saveBackup({
            deploymentName: name,
            filename: result.filename,
            label,
            sizeBytes: result.sizeBytes,
            createdBy: auth.username,
            createdAt: result.timestamp,
            volumePaths: ['data', 'uploads'],
            relatedBuildLogId: d.currentBuildLogId ?? null,
            auto: false,
          });
        }

        addDeployEvent(name, { action: 'backup', username: auth.username, source: 'ui' });
        return json(res, result, 201);
      }

      if (backupsMatch && method === 'GET') {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const name = backupsMatch[1];
        const d = getDeployment(name);
        if (!d || d.username !== auth.username) return error(res, 'Not found', 404);

        const dbBackups = getBackups(name);
        const volumeSize =
          d.activeNodeId && d.activeNodeId !== 'coordinator' ? null : getVolumeSize(name);

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
        if (basename(filename) !== filename) return error(res, 'Invalid backup filename', 400);

        if (d.activeNodeId && d.activeNodeId !== 'coordinator') {
          const backupPath = resolve(getBackupDir(name), filename);
          if (!existsSync(backupPath)) return error(res, 'Backup file not found', 404);
          await dispatchAgentCommand(d.activeNodeId, 'restore', name, {}, 10 * 60_000, backupPath);
        } else {
          restoreBackup(name, filename);
          await restartContainer(name);
        }
        recordContainerStart(name);

        addDeployEvent(name, { action: 'restore', username: auth.username, source: 'ui' });
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

        const url = new URL(req.url!, `http://${req.headers.host}`);
        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const { rows, total, pageSize } = getBuildLogs(name, page);
        const activeBuild = getActiveBuildLog(name);
        return json(res, {
          logs: rows,
          total,
          page,
          pageSize,
          activeBuild: activeBuild
            ? {
                output: activeBuild.output,
                timestamp: activeBuild.timestamp,
                phase: d.status || 'building',
              }
            : null,
        });
      }

      // ── Not an API route — pass to next middleware ─────────────────────
      next();
    } catch (err: unknown) {
      console.error(err);
      error(res, (err as Error).message || 'Internal server error', 500);
    }
  };
}
