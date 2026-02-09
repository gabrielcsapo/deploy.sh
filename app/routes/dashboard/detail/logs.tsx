'use client';

import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router';
import { getAuth } from './shared';
import type { DetailContext } from './shared';

export default function Component() {
  const { deployment } = useOutletContext<DetailContext>();
  const name = deployment.name;
  const [logs, setLogs] = useState('');
  const [streaming, setStreaming] = useState(false);
  const containerRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    setStreaming(true);
    setLogs('');

    const auth = getAuth();
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`/api/deployments/${name}/logs`, {
          headers: {
            'x-deploy-username': auth?.username || '',
            'x-deploy-token': auth?.token || '',
          },
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          setStreaming(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          setLogs((prev) => prev + decoder.decode(value, { stream: true }));
        }
      } catch {
        // aborted or network error
      }
      setStreaming(false);
    })();

    return () => {
      controller.abort();
    };
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
          {streaming && (
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
        {logs || (streaming ? 'Waiting for logs...' : 'No logs available.')}
      </pre>
    </div>
  );
}
