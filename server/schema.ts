import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  username: text('username').primaryKey(),
  password: text('password').notNull(),
  createdAt: text('created_at').notNull(),
});

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull(),
  token: text('token').notNull(),
  label: text('label'),
  createdAt: text('created_at').notNull(),
});

export const deployments = sqliteTable('deployments', {
  name: text('name').primaryKey(),
  type: text('type'),
  username: text('username').notNull(),
  port: integer('port'),
  containerId: text('container_id'),
  containerName: text('container_name'),
  directory: text('directory'),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
});

export const history = sqliteTable('history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  deploymentName: text('deployment_name').notNull(),
  action: text('action').notNull(),
  username: text('username'),
  type: text('type'),
  port: integer('port'),
  containerId: text('container_id'),
  timestamp: text('timestamp').notNull(),
});

export const requestLogs = sqliteTable('request_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  deploymentName: text('deployment_name').notNull(),
  method: text('method').notNull(),
  path: text('path').notNull(),
  status: integer('status').notNull(),
  duration: integer('duration').notNull(),
  timestamp: integer('timestamp').notNull(),
});

export const resourceMetrics = sqliteTable('resource_metrics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  deploymentName: text('deployment_name').notNull(),
  cpuPercent: real('cpu_percent').notNull(),
  memUsageBytes: integer('mem_usage_bytes').notNull(),
  memLimitBytes: integer('mem_limit_bytes').notNull(),
  memPercent: real('mem_percent').notNull(),
  netRxBytes: integer('net_rx_bytes').notNull(),
  netTxBytes: integer('net_tx_bytes').notNull(),
  blockReadBytes: integer('block_read_bytes').notNull(),
  blockWriteBytes: integer('block_write_bytes').notNull(),
  pids: integer('pids').notNull(),
  timestamp: integer('timestamp').notNull(),
});
