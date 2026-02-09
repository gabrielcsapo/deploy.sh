'use client';

export function appUrl(name: string) {
  if (typeof window === 'undefined') return `http://${name}.localhost:5050`;
  return `${window.location.protocol}//${name}.${window.location.host}`;
}

export function getAuth() {
  try {
    const raw = localStorage.getItem('deploy-sh-auth');
    if (!raw) return null;
    return JSON.parse(raw) as { username: string; token: string };
  } catch {
    return null;
  }
}

export interface Deployment {
  name: string;
  type: string;
  port: number;
  status: string;
  containerId: string;
  createdAt: string;
}

export interface ContainerInfo {
  id: string;
  image: string;
  created: string;
  started: string;
  finished: string;
  status: string;
  restartCount: number;
  env: string[];
}

export interface DetailContext {
  deployment: Deployment;
  inspect: ContainerInfo | null;
  fetchDeployment: () => void;
  fetchInspect: () => void;
}

export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'running' ? 'badge-success' : status === 'exited' ? 'badge-danger' : 'badge-warning';
  return <span className={`badge ${cls}`}>{status}</span>;
}

export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-text-tertiary mb-1">{label}</p>
      <p className="text-lg font-semibold font-mono">{value}</p>
      {sub && <p className="text-xs text-text-secondary mt-0.5">{sub}</p>}
    </div>
  );
}
