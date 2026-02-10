'use server';

import {
  authenticate,
  getUser as _getUser,
  changePassword as _changePassword,
} from '../../server/store.ts';

function requireAuth(username: string, token: string) {
  if (!authenticate(username, token)) {
    throw new Error('Unauthorized');
  }
}

export async function fetchUser(username: string, token: string) {
  requireAuth(username, token);
  return _getUser(username);
}

export async function updatePassword(
  username: string,
  token: string,
  currentPassword: string,
  newPassword: string,
) {
  requireAuth(username, token);
  const result = _changePassword(username, currentPassword, newPassword);
  if ('error' in result) throw new Error(result.error);
  return { message: 'Password changed' };
}
