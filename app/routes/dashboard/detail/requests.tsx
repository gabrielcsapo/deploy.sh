'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router';
import { fetchRequestData as serverFetchRequests } from '../../../actions/deployments';
import { appUrl, getAuth, StatCard } from './shared';
import type { DetailContext } from './shared';

interface RequestLog {
  method: string;
  path: string;
  status: number;
  duration: number;
  timestamp: number;
}

interface RequestSummary {
  total: number;
  statusCodes: Record<string, number>;
  avgDuration: number;
  recentRpm: number;
}

export default function Component() {
  const { deployment } = useOutletContext<DetailContext>();
  const name = deployment.name;
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [summary, setSummary] = useState<RequestSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    try {
      const auth = getAuth();
      if (!auth) return;
      const data = await serverFetchRequests(auth.username, auth.token, name);
      setLogs(data.logs as RequestLog[]);
      setSummary(data.summary as RequestSummary);
    } catch {
      // may not have data yet
    } finally {
      setLoading(false);
    }
  }, [name]);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 3000);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  if (loading) {
    return <div className="text-sm text-text-tertiary text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="card p-4">
        <p className="text-xs text-text-tertiary mb-2">
          App URL:{' '}
          <a
            href={appUrl(name)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-hover font-mono"
          >
            {name}.localhost
          </a>
        </p>
        <p className="text-xs text-text-secondary">
          All traffic to this subdomain is tracked automatically.
        </p>
      </div>

      {summary && summary.total > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Requests" value={String(summary.total)} />
            <StatCard label="Avg Response" value={`${summary.avgDuration}ms`} />
            <StatCard label="Requests/min" value={String(summary.recentRpm)} />
            <div className="card p-4">
              <p className="text-xs text-text-tertiary mb-1">Status Codes</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {Object.entries(summary.statusCodes).map(([code, count]) => (
                  <span
                    key={code}
                    className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                      code === '2xx'
                        ? 'bg-success/10 text-success'
                        : code === '3xx'
                          ? 'bg-accent/10 text-accent'
                          : code === '4xx'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-danger/10 text-danger'
                    }`}
                  >
                    {code}: {count}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider px-4 py-3 border-b border-border">
              Recent Requests
            </h3>
            <div className="overflow-auto max-h-[400px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-text-tertiary">
                    <th className="px-4 py-2 font-medium">Method</th>
                    <th className="px-4 py-2 font-medium">Path</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Duration</th>
                    <th className="px-4 py-2 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...logs]
                    .reverse()
                    .slice(0, 100)
                    .map((log, i) => (
                      <tr key={i} className="hover:bg-bg-hover transition-colors">
                        <td className="px-4 py-2 font-mono text-xs font-medium">{log.method}</td>
                        <td className="px-4 py-2 font-mono text-xs text-text-secondary truncate max-w-[200px]">
                          {log.path}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                              log.status < 300
                                ? 'bg-success/10 text-success'
                                : log.status < 400
                                  ? 'bg-accent/10 text-accent'
                                  : log.status < 500
                                    ? 'bg-warning/10 text-warning'
                                    : 'bg-danger/10 text-danger'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-text-secondary">
                          {log.duration}ms
                        </td>
                        <td className="px-4 py-2 text-xs text-text-tertiary">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="card p-6 text-center text-sm text-text-secondary">
          No requests recorded yet. Send traffic to the app URL above to see analytics.
        </div>
      )}
    </div>
  );
}
