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
} from '../../server/store.ts';
import {
  getContainerStatus,
  getContainerInspect as _getContainerInspect,
  stopContainer,
  restartContainer as _restartContainer,
} from '../../server/docker.ts';

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
