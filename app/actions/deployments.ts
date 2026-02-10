'use server';

import {
  authenticate,
  getDeployments as _getDeployments,
  getDeployment as _getDeployment,
  deleteDeployment as _deleteDeployment,
  addDeployEvent,
  getDeployHistory as _getDeployHistory,
  getRequestLogs as _getRequestLogs,
  getRequestSummary as _getRequestSummary,
  getBackups as _getBackups,
  saveBackup as _saveBackup,
  deleteBackupRecord as _deleteBackupRecord,
  getBuildLogs as _getBuildLogs,
} from '../../server/store.ts';
import {
  getContainerStatus,
  getContainerInspect as _getContainerInspect,
  stopContainer,
  restartContainer as _restartContainer,
} from '../../server/docker.ts';
import {
  createBackup as _createBackup,
  restoreBackup as _restoreBackup,
  deleteBackupFile as _deleteBackupFile,
  getVolumeSize as _getVolumeSize,
} from '../../server/volumes.ts';

function requireAuth(username: string, token: string) {
  if (!authenticate(username, token)) {
    throw new Error('Unauthorized');
  }
}

export async function fetchDeployments(username: string, token: string) {
  requireAuth(username, token);
  return _getDeployments(username).map((d) => ({
    ...d,
    status: getContainerStatus(d.name),
  }));
}

export async function fetchDeployment(username: string, token: string, name: string) {
  requireAuth(username, token);
  const d = _getDeployment(name);
  if (!d || d.username !== username) throw new Error('Not found');
  return { ...d, status: getContainerStatus(d.name) };
}

export async function deleteDeployment(username: string, token: string, name: string) {
  requireAuth(username, token);
  const d = _getDeployment(name);
  if (!d || d.username !== username) throw new Error('Not found');
  stopContainer(name);
  addDeployEvent(name, { action: 'delete', username });
  _deleteDeployment(name);
  return { message: `Deleted ${name}` };
}

export async function fetchContainerInspect(username: string, token: string, name: string) {
  requireAuth(username, token);
  const d = _getDeployment(name);
  if (!d || d.username !== username) throw new Error('Not found');
  return _getContainerInspect(name);
}

export async function restartDeployment(username: string, token: string, name: string) {
  requireAuth(username, token);
  const d = _getDeployment(name);
  if (!d || d.username !== username) throw new Error('Not found');
  _restartContainer(name);
  addDeployEvent(name, { action: 'restart', username });
  return { message: `Restarted ${name}` };
}

export async function fetchDeployHistory(username: string, token: string, name: string) {
  requireAuth(username, token);
  const d = _getDeployment(name);
  if (!d || d.username !== username) throw new Error('Not found');
  return _getDeployHistory(name);
}

export async function fetchRequestData(username: string, token: string, name: string) {
  requireAuth(username, token);
  const d = _getDeployment(name);
  if (!d || d.username !== username) throw new Error('Not found');
  return {
    logs: _getRequestLogs(name),
    summary: _getRequestSummary(name),
  };
}

export async function fetchBackups(username: string, token: string, name: string) {
  requireAuth(username, token);
  const d = _getDeployment(name);
  if (!d || d.username !== username) throw new Error('Not found');

  const backups = _getBackups(name);
  const volumeSize = _getVolumeSize(name);

  return { backups, volumeSize };
}

export async function createBackup(
  username: string,
  token: string,
  name: string,
  label?: string,
) {
  requireAuth(username, token);
  const d = _getDeployment(name);
  if (!d || d.username !== username) throw new Error('Not found');

  const result = _createBackup(name, label);
  _saveBackup({
    deploymentName: name,
    filename: result.filename,
    label: label || null,
    sizeBytes: result.sizeBytes,
    createdBy: username,
    createdAt: result.timestamp,
    volumePaths: ['data', 'uploads'],
  });

  addDeployEvent(name, { action: 'backup', username });
  return result;
}

export async function restoreBackup(
  username: string,
  token: string,
  name: string,
  filename: string,
) {
  requireAuth(username, token);
  const d = _getDeployment(name);
  if (!d || d.username !== username) throw new Error('Not found');

  _restoreBackup(name, filename);
  _restartContainer(name);

  addDeployEvent(name, { action: 'restore', username });
  return { message: 'Backup restored and container restarted' };
}

export async function deleteBackup(
  username: string,
  token: string,
  name: string,
  filename: string,
) {
  requireAuth(username, token);
  const d = _getDeployment(name);
  if (!d || d.username !== username) throw new Error('Not found');

  _deleteBackupFile(name, filename);
  _deleteBackupRecord(name, filename);

  return { message: 'Backup deleted' };
}

export async function fetchBuildLogs(username: string, token: string, name: string) {
  requireAuth(username, token);
  const d = _getDeployment(name);
  if (!d || d.username !== username) throw new Error('Not found');

  return _getBuildLogs(name);
}
