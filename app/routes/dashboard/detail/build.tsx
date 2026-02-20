'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useOutletContext } from 'react-router';
import { fetchBuildLogs as serverFetchBuildLogs } from '../../../actions/deployments';
import { getAuth } from './shared';
import type { DetailContext } from './shared';
import { useWebSocket } from '../../../hooks/useWebSocket';

interface BuildLog {
  id: number;
  deploymentName: string;
  output: string;
  success: boolean | null;
  duration: number | null;
  status: string;
  runtimeLogs: string | null;
  timestamp: string;
}

interface BuildLogsResponse {
  logs: BuildLog[];
  total: number;
  page: number;
  pageSize: number;
  activeBuild: { output: string } | null;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

const TIMESTAMP_RE = /^\[(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)\]\s/;
const DOCKER_TS_RE = /^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s/;

function formatLogTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour12: false, fractionalSecondDigits: 3 });
}

function LogOutput({ output }: { output: string }) {
  const lines = output.split('\n').filter(Boolean);
  return (
    <>
      {lines.map((line, i) => {
        const match = line.match(TIMESTAMP_RE);
        if (match) {
          const ts = match[1];
          const content = line.slice(match[0].length);
          return (
            <div key={i} className="flex gap-2">
              <span className="text-text-tertiary select-none shrink-0">{formatLogTime(ts)}</span>
              <span>{content}</span>
            </div>
          );
        }
        return <div key={i}>{line}</div>;
      })}
    </>
  );
}

function RuntimeLogOutput({ output }: { output: string }) {
  const lines = output.split('\n').filter(Boolean);
  return (
    <>
      {lines.map((line, i) => {
        const match = line.match(DOCKER_TS_RE);
        if (match) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-text-tertiary select-none shrink-0">
                {formatLogTime(match[1])}
              </span>
              <span>{line.slice(match[0].length)}</span>
            </div>
          );
        }
        return <div key={i}>{line}</div>;
      })}
    </>
  );
}

type OutputTab = 'build' | 'runtime';

export default function Component() {
  const { name } = useParams();
  const { deployment } = useOutletContext<DetailContext>();
  const [logs, setLogs] = useState<BuildLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<BuildLog | null>(null);
  // Live build state
  const [liveOutput, setLiveOutput] = useState('');
  const [isBuilding, setIsBuilding] = useState(false);
  const liveOutputRef = useRef<HTMLDivElement>(null);
  // Tab state
  const [activeTab, setActiveTab] = useState<OutputTab>('build');
  // Live runtime logs (for current build)
  const [liveRuntimeLogs, setLiveRuntimeLogs] = useState('');
  const runtimeLogsRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Whether the selected log is the currently running build
  const isCurrentBuild = selectedLog && selectedLog.id === deployment.currentBuildLogId;

  const fetchPage = useCallback(
    (p: number, selectLatest = false) => {
      const auth = getAuth();
      if (!auth) return;

      serverFetchBuildLogs(auth.username, auth.token, name!, p).then(
        (data: BuildLogsResponse) => {
          // Filter out in-progress builds from history (shown separately as live build)
          setLogs(data.logs.filter((l) => l.status !== 'building'));
          setTotal(data.total);
          setPage(data.page);
          setPageSize(data.pageSize);
          if (data.activeBuild) {
            setIsBuilding(true);
            setLiveOutput(data.activeBuild.output);
            setSelectedLog(null);
          } else if (selectLatest && data.logs.length > 0) {
            // Logs are already sorted newest-first from the server
            setSelectedLog(data.logs[0]);
          }
        },
      );
    },
    [name],
  );

  useEffect(() => {
    setLoading(true);
    fetchPage(1, true);
    setLoading(false);
  }, [fetchPage]);

  // WebSocket channels: always subscribe to deployment events,
  // and conditionally to container logs when viewing current build's runtime tab
  const channels = useMemo(() => {
    const chs = [`deployment:${name}`];
    if (isCurrentBuild && activeTab === 'runtime') {
      chs.push(`deployment:${name}:logs`);
    }
    return chs;
  }, [name, isCurrentBuild, activeTab]);

  const handleWsEvent = useCallback(
    (event: { type: string; deploymentName: string; data: Record<string, unknown> }) => {
      if (event.deploymentName !== name) return;

      if (event.type === 'deployment:status' && event.data.status === 'building') {
        setIsBuilding(true);
        setLiveOutput('');
        setSelectedLog(null);
        setActiveTab('build');
      } else if (event.type === 'build:output') {
        const ts = (event.data.timestamp as string) || new Date().toISOString();
        setLiveOutput((prev) => prev + `[${ts}] ${event.data.line as string}\n`);
      } else if (event.type === 'build:complete') {
        setIsBuilding(false);
        // Go back to page 1 and select the newest build
        fetchPage(1, true);
      } else if (event.type === 'container:logs') {
        setLiveRuntimeLogs((prev) => prev + (event.data.line as string));
      }
    },
    [name, fetchPage],
  );
  useWebSocket(channels, handleWsEvent);

  // Auto-scroll live output
  useEffect(() => {
    if (liveOutputRef.current) {
      liveOutputRef.current.scrollTop = liveOutputRef.current.scrollHeight;
    }
  }, [liveOutput]);

  // Auto-scroll runtime logs
  useEffect(() => {
    if (runtimeLogsRef.current) {
      runtimeLogsRef.current.scrollTop = runtimeLogsRef.current.scrollHeight;
    }
  }, [liveRuntimeLogs]);

  // Reset live runtime logs when switching builds
  useEffect(() => {
    setLiveRuntimeLogs('');
  }, [selectedLog?.id]);

  if (loading) {
    return <div className="text-sm text-text-tertiary text-center py-8">Loading...</div>;
  }

  if (!isBuilding && total === 0) {
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
            {total} build{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isBuilding && (
            <button
              onClick={() => {
                setSelectedLog(null);
                setActiveTab('build');
              }}
              className={`w-full px-4 py-3 text-left border-b border-border border-l-2 transition-colors ${
                selectedLog === null
                  ? 'border-l-warning bg-warning/10'
                  : 'border-l-transparent hover:bg-bg-tertiary'
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
          {/* Logs arrive newest-first from the server */}
          {logs.map((log) => (
            <button
              key={log.id}
              onClick={() => setSelectedLog(log)}
              className={`w-full px-4 py-3 text-left border-b border-border border-l-2 transition-colors ${
                selectedLog?.id === log.id
                  ? 'border-l-accent bg-accent/10'
                  : 'border-l-transparent hover:bg-bg-tertiary'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-medium ${
                    log.id === deployment.currentBuildLogId
                      ? 'text-accent'
                      : log.success
                        ? 'text-success'
                        : 'text-danger'
                  }`}
                >
                  {log.id === deployment.currentBuildLogId
                    ? '● Current'
                    : log.success
                      ? '✓ Success'
                      : '✗ Failed'}
                </span>
                <span className="text-xs text-text-tertiary">{log.duration != null ? formatDuration(log.duration) : '...'}</span>
              </div>
              <time className="text-xs text-text-secondary">
                {new Date(log.timestamp).toLocaleString()}
              </time>
            </button>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-2 border-t border-border flex items-center justify-between">
            <button
              className="btn btn-sm"
              disabled={page <= 1}
              onClick={() => fetchPage(page - 1)}
            >
              Prev
            </button>
            <span className="text-xs text-text-tertiary">
              {page} / {totalPages}
            </span>
            <button
              className="btn btn-sm"
              disabled={page >= totalPages}
              onClick={() => fetchPage(page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Build output / Runtime logs */}
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
            <div ref={liveOutputRef} className="flex-1 overflow-y-auto p-4 bg-bg-tertiary">
              <div className="text-xs font-mono whitespace-pre-wrap break-words">
                {liveOutput ? <LogOutput output={liveOutput} /> : 'Waiting for build output...'}
              </div>
            </div>
          </>
        ) : selectedLog ? (
          <>
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveTab('build')}
                    className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                      activeTab === 'build'
                        ? 'bg-bg-active text-text'
                        : 'text-text-tertiary hover:text-text-secondary'
                    }`}
                  >
                    Build Output
                  </button>
                  <button
                    onClick={() => setActiveTab('runtime')}
                    className={`px-3 py-1 text-sm font-medium rounded transition-colors flex items-center gap-1.5 ${
                      activeTab === 'runtime'
                        ? 'bg-bg-active text-text'
                        : 'text-text-tertiary hover:text-text-secondary'
                    }`}
                  >
                    Runtime Logs
                    {isCurrentBuild && (
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-tertiary">
                    {selectedLog.duration != null ? formatDuration(selectedLog.duration) : '...'}
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
            {activeTab === 'build' ? (
              <div className="flex-1 overflow-y-auto p-4 bg-bg-tertiary">
                <div className="text-xs font-mono whitespace-pre-wrap break-words">
                  {selectedLog.output ? <LogOutput output={selectedLog.output} /> : 'No output captured'}
                </div>
              </div>
            ) : (
              <div ref={runtimeLogsRef} className="flex-1 overflow-y-auto p-4 bg-bg-tertiary">
                <div className="text-xs font-mono whitespace-pre-wrap break-words">
                  {isCurrentBuild ? (
                    liveRuntimeLogs ? (
                      <RuntimeLogOutput output={liveRuntimeLogs} />
                    ) : (
                      <span className="text-text-tertiary">Waiting for logs...</span>
                    )
                  ) : selectedLog.runtimeLogs ? (
                    <RuntimeLogOutput output={selectedLog.runtimeLogs} />
                  ) : (
                    <span className="text-text-tertiary">No runtime logs captured for this build</span>
                  )}
                </div>
              </div>
            )}
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
