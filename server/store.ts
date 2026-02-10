import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq, and } from 'drizzle-orm';
import { users, sessions, deployments, history, requestLogs, resourceMetrics } from './schema.ts';
import type { RawContainerStats } from './docker.ts';

const DATA_DIR = resolve(process.cwd(), '.deploy-data');
const DB_FILE = resolve(DATA_DIR, 'deploy.db');
const UPLOADS_DIR = resolve(DATA_DIR, 'uploads');

let _sqlite: InstanceType<typeof Database> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (_db) return _db;

  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

  _sqlite = new Database(DB_FILE);
  _sqlite.pragma('journal_mode = WAL');

  _sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      token TEXT NOT NULL,
      label TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_username ON sessions(username);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE TABLE IF NOT EXISTS deployments (
      name TEXT PRIMARY KEY,
      type TEXT,
      username TEXT NOT NULL,
      port INTEGER,
      container_id TEXT,
      container_name TEXT,
      directory TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deployment_name TEXT NOT NULL,
      action TEXT NOT NULL,
      username TEXT,
      type TEXT,
      port INTEGER,
      container_id TEXT,
      timestamp TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS request_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deployment_name TEXT NOT NULL,
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      status INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      timestamp INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_request_logs_deployment
      ON request_logs(deployment_name);
    CREATE INDEX IF NOT EXISTS idx_request_logs_timestamp
      ON request_logs(deployment_name, timestamp);
    CREATE INDEX IF NOT EXISTS idx_history_deployment
      ON history(deployment_name);
    CREATE INDEX IF NOT EXISTS idx_deployments_username
      ON deployments(username);
    CREATE TABLE IF NOT EXISTS resource_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deployment_name TEXT NOT NULL,
      cpu_percent REAL NOT NULL,
      mem_usage_bytes INTEGER NOT NULL,
      mem_limit_bytes INTEGER NOT NULL,
      mem_percent REAL NOT NULL,
      net_rx_bytes INTEGER NOT NULL,
      net_tx_bytes INTEGER NOT NULL,
      block_read_bytes INTEGER NOT NULL,
      block_write_bytes INTEGER NOT NULL,
      pids INTEGER NOT NULL,
      timestamp INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_resource_metrics_deployment
      ON resource_metrics(deployment_name);
    CREATE INDEX IF NOT EXISTS idx_resource_metrics_timestamp
      ON resource_metrics(deployment_name, timestamp);
  `);

  // Migrate: move existing users.token values to sessions table, then drop the column
  const columns = _sqlite.pragma('table_info(users)') as { name: string }[];
  if (columns.some((c) => c.name === 'token')) {
    _sqlite.exec(`
      INSERT INTO sessions (username, token, label, created_at)
        SELECT username, token, 'migrated', created_at
        FROM users WHERE token IS NOT NULL;
      ALTER TABLE users DROP COLUMN token;
    `);
  }

  _db = drizzle(_sqlite);
  return _db;
}

export function _resetDb() {
  if (_sqlite) _sqlite.close();
  _sqlite = null;
  _db = null;
}

export function getUploadsDir() {
  return UPLOADS_DIR;
}

function hashPassword(password: string) {
  return createHash('sha256').update(password).digest('hex');
}

function generateToken() {
  return randomBytes(32).toString('hex');
}

// ── Users ───────────────────────────────────────────────────────────────────

export function registerUser(username: string, password: string) {
  const db = getDb();
  const existing = db.select().from(users).where(eq(users.username, username)).get();
  if (existing) {
    return { error: 'User already exists' as const, status: 409 as const };
  }
  const now = new Date().toISOString();
  db.insert(users)
    .values({
      username,
      password: hashPassword(password),
      createdAt: now,
    })
    .run();
  const token = generateToken();
  db.insert(sessions).values({ username, token, createdAt: now }).run();
  return { token };
}

export function loginUser(username: string, password: string) {
  const db = getDb();
  const user = db.select().from(users).where(eq(users.username, username)).get();
  if (!user || user.password !== hashPassword(password)) {
    return { error: 'Invalid credentials' as const, status: 401 as const };
  }
  const token = generateToken();
  db.insert(sessions)
    .values({ username, token, createdAt: new Date().toISOString() })
    .run();
  return { token };
}

export function authenticate(
  username: string | null | undefined,
  token: string | null | undefined,
) {
  if (!username || !token) return false;
  const db = getDb();
  const session = db
    .select()
    .from(sessions)
    .where(and(eq(sessions.username, username), eq(sessions.token, token)))
    .get();
  return session != null;
}

export function logoutUser(username: string, token: string) {
  const db = getDb();
  db.delete(sessions)
    .where(and(eq(sessions.username, username), eq(sessions.token, token)))
    .run();
}

export function changePassword(username: string, currentPassword: string, newPassword: string) {
  const db = getDb();
  const user = db.select().from(users).where(eq(users.username, username)).get();
  if (!user || user.password !== hashPassword(currentPassword)) {
    return { error: 'Invalid current password' as const, status: 401 as const };
  }
  db.update(users)
    .set({ password: hashPassword(newPassword) })
    .where(eq(users.username, username))
    .run();
  return { success: true as const };
}

export function getUser(username: string) {
  const db = getDb();
  const user = db
    .select({ username: users.username, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.username, username))
    .get();
  return user || null;
}

// ── Deployments ─────────────────────────────────────────────────────────────

interface DeploymentInput {
  name: string;
  type?: string;
  username: string;
  port?: number;
  containerId?: string;
  containerName?: string;
  directory?: string;
  createdAt?: string;
}

export function saveDeployment(deployment: DeploymentInput) {
  const db = getDb();
  const now = new Date().toISOString();
  db.insert(deployments)
    .values({
      name: deployment.name,
      type: deployment.type || null,
      username: deployment.username,
      port: deployment.port || null,
      containerId: deployment.containerId || null,
      containerName: deployment.containerName || null,
      directory: deployment.directory || null,
      createdAt: deployment.createdAt || now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: deployments.name,
      set: {
        type: deployment.type || null,
        username: deployment.username,
        port: deployment.port || null,
        containerId: deployment.containerId || null,
        containerName: deployment.containerName || null,
        directory: deployment.directory || null,
        updatedAt: now,
      },
    })
    .run();
}

export function getDeployment(name: string) {
  const db = getDb();
  return db.select().from(deployments).where(eq(deployments.name, name)).get() || null;
}

export function getDeployments(username: string) {
  const db = getDb();
  return db.select().from(deployments).where(eq(deployments.username, username)).all();
}

export function deleteDeployment(name: string) {
  const db = getDb();
  db.delete(deployments).where(eq(deployments.name, name)).run();
}

export function getAllDeployments() {
  const db = getDb();
  return db.select().from(deployments).all();
}

// ── Deployment history ───────────────────────────────────────────────────────

interface DeployEvent {
  action: string;
  username?: string;
  type?: string;
  port?: number;
  containerId?: string;
}

export function addDeployEvent(name: string, event: DeployEvent) {
  const db = getDb();
  db.insert(history)
    .values({
      deploymentName: name,
      action: event.action,
      username: event.username || null,
      type: event.type || null,
      port: event.port || null,
      containerId: event.containerId || null,
      timestamp: new Date().toISOString(),
    })
    .run();
}

export function getDeployHistory(name: string) {
  const db = getDb();
  return db.select().from(history).where(eq(history.deploymentName, name)).all();
}

// ── Request logs ────────────────────────────────────────────────────────────

const MAX_LOGS_PER_APP = 500;

interface RequestEntry {
  method: string;
  path: string;
  status: number;
  duration: number;
  timestamp: number;
}

export function logRequest(name: string, entry: RequestEntry) {
  const db = getDb();
  db.insert(requestLogs)
    .values({
      deploymentName: name,
      method: entry.method,
      path: entry.path,
      status: entry.status,
      duration: entry.duration,
      timestamp: entry.timestamp,
    })
    .run();

  // Enforce ring buffer: keep only the most recent MAX_LOGS_PER_APP entries
  _sqlite!
    .prepare(
      `
    DELETE FROM request_logs
    WHERE deployment_name = ? AND id NOT IN (
      SELECT id FROM request_logs
      WHERE deployment_name = ?
      ORDER BY id DESC
      LIMIT ?
    )
  `,
    )
    .run(name, name, MAX_LOGS_PER_APP);
}

export function getRequestLogs(name: string) {
  const db = getDb();
  return db
    .select({
      method: requestLogs.method,
      path: requestLogs.path,
      status: requestLogs.status,
      duration: requestLogs.duration,
      timestamp: requestLogs.timestamp,
    })
    .from(requestLogs)
    .where(eq(requestLogs.deploymentName, name))
    .all();
}

export function getRequestSummary(name: string) {
  const logs = getRequestLogs(name);
  if (logs.length === 0)
    return { total: 0, statusCodes: {} as Record<string, number>, avgDuration: 0, recentRpm: 0 };

  const statusCodes: Record<string, number> = {};
  let totalDuration = 0;
  for (const log of logs) {
    const group = `${Math.floor(log.status / 100)}xx`;
    statusCodes[group] = (statusCodes[group] || 0) + 1;
    totalDuration += log.duration;
  }

  const oneMinAgo = Date.now() - 60_000;
  const recentCount = logs.filter((l) => l.timestamp > oneMinAgo).length;

  return {
    total: logs.length,
    statusCodes,
    avgDuration: Math.round(totalDuration / logs.length),
    recentRpm: recentCount,
  };
}

// ── Resource metrics ───────────────────────────────────────────────────────

const MAX_METRICS_PER_APP = 2880; // ~24h at 30s intervals

export function logMetrics(name: string, metrics: RawContainerStats) {
  const db = getDb();
  db.insert(resourceMetrics)
    .values({
      deploymentName: name,
      cpuPercent: metrics.cpuPercent,
      memUsageBytes: metrics.memUsageBytes,
      memLimitBytes: metrics.memLimitBytes,
      memPercent: metrics.memPercent,
      netRxBytes: metrics.netRxBytes,
      netTxBytes: metrics.netTxBytes,
      blockReadBytes: metrics.blockReadBytes,
      blockWriteBytes: metrics.blockWriteBytes,
      pids: metrics.pids,
      timestamp: metrics.timestamp,
    })
    .run();

  _sqlite!
    .prepare(
      `
    DELETE FROM resource_metrics
    WHERE deployment_name = ? AND id NOT IN (
      SELECT id FROM resource_metrics
      WHERE deployment_name = ?
      ORDER BY id DESC
      LIMIT ?
    )
  `,
    )
    .run(name, name, MAX_METRICS_PER_APP);
}

export function getMetricsHistory(name: string, since: number) {
  const db = getDb();
  return db
    .select({
      cpuPercent: resourceMetrics.cpuPercent,
      memUsageBytes: resourceMetrics.memUsageBytes,
      memLimitBytes: resourceMetrics.memLimitBytes,
      memPercent: resourceMetrics.memPercent,
      netRxBytes: resourceMetrics.netRxBytes,
      netTxBytes: resourceMetrics.netTxBytes,
      blockReadBytes: resourceMetrics.blockReadBytes,
      blockWriteBytes: resourceMetrics.blockWriteBytes,
      pids: resourceMetrics.pids,
      timestamp: resourceMetrics.timestamp,
    })
    .from(resourceMetrics)
    .where(eq(resourceMetrics.deploymentName, name))
    .all()
    .filter((r) => r.timestamp >= since);
}
