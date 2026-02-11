'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router';
import type { DetailContext } from './shared';
import { useWebSocket } from '../../../hooks/useWebSocket';

export default function Component() {
  const { deployment } = useOutletContext<DetailContext>();
  const name = deployment.name;
  const [logs, setLogs] = useState('');
  const containerRef = useRef<HTMLPreElement>(null);

  const channels = useMemo(() => [`deployment:${name}:logs`], [name]);

  const handleWsEvent = useCallback((event: { type: string; data: Record<string, unknown> }) => {
    if (event.type === 'container:logs') {
      setLogs((prev) => prev + (event.data.line as string));
    }
  }, []);

  const { connected } = useWebSocket(channels, handleWsEvent);

  // Reset logs when deployment name changes
  useEffect(() => {
    setLogs('');
  }, [name]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
          Container Logs
        </h3>
        <div className="flex items-center gap-2">
          {connected && (
            <span className="flex items-center gap-1.5 text-xs text-success">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Live
            </span>
          )}
        </div>
      </div>
      <pre
        ref={containerRef}
        className="card p-4 text-xs font-mono leading-relaxed text-text-secondary overflow-auto max-h-[500px] whitespace-pre-wrap"
      >
        {logs || (connected ? 'Waiting for logs...' : 'Connecting...')}
      </pre>
    </div>
  );
}
