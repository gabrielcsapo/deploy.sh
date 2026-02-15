'use client';

import { useOutletContext } from 'react-router';
import {
  restartDeployment as serverRestart,
  updateDeploymentSettings as serverUpdateSettings,
} from '../../../actions/deployments';
import { appUrl, getAuth, StatusBadge, parseExtraPorts } from './shared';
import type { DetailContext } from './shared';

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-secondary">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

function formatUptime(ms: number) {
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ${secs % 60}s`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export default function Component() {
  const { deployment, inspect, fetchDeployment, fetchInspect } = useOutletContext<DetailContext>();

  const started = inspect?.started ? new Date(inspect.started) : null;
  const uptime = started ? formatUptime(Date.now() - started.getTime()) : 'N/A';
  const extraPorts = parseExtraPorts(deployment);

  async function handleRestart() {
    const auth = getAuth();
    if (!auth) return;
    await serverRestart(auth.username, auth.token, deployment.name);
    fetchDeployment();
    fetchInspect();
  }

  async function handleToggleDiscoverable() {
    const auth = getAuth();
    if (!auth) return;
    await serverUpdateSettings(auth.username, auth.token, deployment.name, {
      discoverable: !deployment.discoverable,
    });
    fetchDeployment();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4 space-y-3">
          <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
            Container
          </h3>
          <InfoRow label="Status">
            <StatusBadge status={deployment.status} />
          </InfoRow>
          <InfoRow label="Uptime">{uptime}</InfoRow>
          <InfoRow label="Restarts">{inspect?.restartCount ?? 'N/A'}</InfoRow>
          <InfoRow label="Image">
            <span className="font-mono text-xs">{inspect?.image ?? 'N/A'}</span>
          </InfoRow>
          <InfoRow label="Container ID">
            <span className="font-mono text-xs">{deployment.containerId?.slice(0, 12)}</span>
          </InfoRow>
        </div>

        <div className="card p-4 space-y-3">
          <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
            Deployment
          </h3>
          <InfoRow label="Name">{deployment.name}</InfoRow>
          <InfoRow label="Type">
            <span className="badge bg-accent/10 text-accent">{deployment.type}</span>
          </InfoRow>
          <InfoRow label="URL">
            <a
              href={appUrl(deployment.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-hover font-mono text-xs"
            >
              {deployment.name}.local
            </a>
          </InfoRow>
          <InfoRow label="Created">{new Date(deployment.createdAt).toLocaleString()}</InfoRow>
          {extraPorts.length > 0 && (
            <InfoRow label="Extra Ports">
              <span className="font-mono text-xs">
                {extraPorts.map((p, i) => (
                  <span key={i}>
                    {i > 0 && ', '}
                    {p.host}:{p.container}/{p.protocol}
                  </span>
                ))}
              </span>
            </InfoRow>
          )}
        </div>
      </div>

      {inspect?.env && inspect.env.length > 0 && (
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
            Environment Variables
          </h3>
          <div className="space-y-1">
            {inspect.env.map((e, i) => {
              const [key, ...rest] = e.split('=');
              return (
                <div key={i} className="flex gap-2 text-xs font-mono">
                  <span className="text-accent">{key}</span>
                  <span className="text-text-tertiary">=</span>
                  <span className="text-text-secondary">{rest.join('=')}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Discoverable Setting */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold mb-1">Discoverable</p>
            <p className="text-xs text-text-secondary">
              Show this app on the discover.local network directory
            </p>
          </div>
          <button
            onClick={handleToggleDiscoverable}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              deployment.discoverable
                ? 'bg-accent text-white'
                : 'bg-bg-tertiary border border-border text-text-secondary'
            }`}
          >
            {deployment.discoverable ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <a
          href={appUrl(deployment.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary btn-sm"
        >
          Open App
        </a>
        <button type="button" className="btn btn-sm" onClick={handleRestart}>
          Restart
        </button>
      </div>
    </div>
  );
}
