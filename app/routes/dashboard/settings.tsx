'use client';

import { useState, useEffect } from 'react';
import { getAuth } from './detail/shared';
import { fetchUser, updatePassword } from '../../actions/user';

interface UserInfo {
  username: string;
  createdAt: string;
}

export default function Component() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const auth = getAuth();
      if (!auth) return;
      try {
        const data = await fetchUser(auth.username, auth.token);
        setUser(data as UserInfo);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handlePasswordChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (!newPassword) {
      setError('New password is required');
      return;
    }

    setSaving(true);
    try {
      const auth = getAuth();
      if (!auth) return;
      await updatePassword(auth.username, auth.token, currentPassword, newPassword);
      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-text-tertiary py-12 text-center">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-lg font-semibold mb-6">Settings</h1>

      <div className="card p-6 mb-6">
        <h2 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-4">
          Account
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">Username</span>
            <span className="text-sm font-mono">{user?.username}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">Member since</span>
            <span className="text-sm">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-4">
          Change Password
        </h2>
        <form onSubmit={handlePasswordChange} className="flex flex-col gap-3 max-w-sm">
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="input"
            required
          />
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input"
            required
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input"
            required
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          {success && <p className="text-xs text-green-400">{success}</p>}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
