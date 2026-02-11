'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router';
import { fetchBuildLogs as serverFetchBuildLogs } from '../../../actions/deployments';
import { getAuth } from './shared';
import { useWebSocket } from '../../../hooks/useWebSocket';

interface BuildLog {
  id: number;
  deploymentName: string;
  output: string;
  success: boolean;
  duration: number;
  timestamp: string;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export default function Component() {
  const { name } = useParams();
  const [logs, setLogs] = useState<BuildLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<BuildLog | null>(null);
  // Live build state
  const [liveOutput, setLiveOutput] = useState('');
  const [isBuilding, setIsBuilding] = useState(false);
  const liveOutputRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const auth = getAuth();
    if (!auth) return;

    serverFetchBuildLogs(auth.username, auth.token, name!)
      .then((data) => {
        setLogs(data as BuildLog[]);
        if (data.length > 0) {
          setSelectedLog(data[data.length - 1] as BuildLog);
        }
      })
      .finally(() => setLoading(false));
  }, [name]);

  // WebSocket for real-time build output
  const channels = useMemo(() => [`deployment:${name}`], [name]);
  const handleWsEvent = useCallback(
    (event: { type: string; deploymentName: string; data: Record<string, unknown> }) => {
      if (event.deploymentName !== name) return;

      if (event.type === 'deployment:status' && event.data.status === 'building') {
        setIsBuilding(true);
        setLiveOutput('');
        setSelectedLog(null);
      } else if (event.type === 'build:output') {
        setLiveOutput((prev) => prev + (event.data.line as string) + '\n');
      } else if (event.type === 'build:complete') {
        setIsBuilding(false);
        const auth = getAuth();
        if (auth) {
          serverFetchBuildLogs(auth.username, auth.token, name!).then((data) => {
            setLogs(data as BuildLog[]);
            if (data.length > 0) {
              setSelectedLog(data[data.length - 1] as BuildLog);
            }
          });
        }
      }
    },
    [name],
  );
  useWebSocket(channels, handleWsEvent);

  // Auto-scroll live output
  useEffect(() => {
    if (liveOutputRef.current) {
      liveOutputRef.current.scrollTop = liveOutputRef.current.scrollHeight;
    }
  }, [liveOutput]);

  if (loading) {
    return <div className="text-sm text-text-tertiary text-center py-8">Loading...</div>;
  }

  if (!isBuilding && logs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary mb-2">No build logs yet</p>
        <p className="text-xs text-text-tertiary">
          Build logs will appear here after the first deployment
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4 h-[calc(100vh-16rem)]">
      {/* Build history sidebar */}
      <div className="col-span-1 card overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Build History</h3>
          <p className="text-xs text-text-tertiary mt-1">
            {logs.length} build{logs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isBuilding && (
            <button
              onClick={() => setSelectedLog(null)}
              className={`w-full px-4 py-3 text-left border-b border-border hover:bg-bg-tertiary transition-colors ${
                selectedLog === null ? 'bg-bg-tertiary' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 text-xs font-medium text-warning">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                  Building...
                </span>
              </div>
              <time className="text-xs text-text-secondary">In progress</time>
            </button>
          )}
          {logs
            .slice()
            .reverse()
            .map((log) => (
              <button
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className={`w-full px-4 py-3 text-left border-b border-border hover:bg-bg-tertiary transition-colors ${
                  selectedLog?.id === log.id ? 'bg-bg-tertiary' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-medium ${
                      log.success ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {log.success ? '✓ Success' : '✗ Failed'}
                  </span>
                  <span className="text-xs text-text-tertiary">{formatDuration(log.duration)}</span>
                </div>
                <time className="text-xs text-text-secondary">
                  {new Date(log.timestamp).toLocaleString()}
                </time>
              </button>
            ))}
        </div>
      </div>

      {/* Build output */}
      <div className="col-span-2 card overflow-hidden flex flex-col">
        {isBuilding && selectedLog === null ? (
          <>
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Build Output</h3>
                <span className="flex items-center gap-1.5 text-xs text-warning">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                  Building...
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-bg-tertiary">
              <pre
                ref={liveOutputRef}
                className="text-xs font-mono whitespace-pre-wrap break-words"
              >
                {liveOutput || 'Waiting for build output...'}
              </pre>
            </div>
          </>
        ) : selectedLog ? (
          <>
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Build Output</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-tertiary">
                    {formatDuration(selectedLog.duration)}
                  </span>
                  <span
                    className={`badge ${selectedLog.success ? 'badge-success' : 'badge-danger'}`}
                  >
                    {selectedLog.success ? 'Success' : 'Failed'}
                  </span>
                </div>
              </div>
              <time className="text-xs text-text-secondary">
                {new Date(selectedLog.timestamp).toLocaleString()}
              </time>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-bg-tertiary">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                {selectedLog.output || 'No output captured'}
              </pre>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-tertiary">
            Select a build to view output
          </div>
        )}
      </div>
    </div>
  );
}
