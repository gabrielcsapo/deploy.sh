'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router';
import { fetchContainerStats, fetchMetricsHistory } from '../../../actions/metrics';
import type { DetailContext } from './shared';
import { useWebSocket } from '../../../hooks/useWebSocket';

interface Stats {
  cpu: string;
  mem: string;
  memPerc: string;
  net: string;
  block: string;
  pids: string;
}

interface MetricPoint {
  cpuPercent: number;
  memUsageBytes: number;
  memLimitBytes: number;
  memPercent: number;
  netRxBytes: number;
  netTxBytes: number;
  blockReadBytes: number;
  blockWriteBytes: number;
  pids: number;
  timestamp: number;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KiB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MiB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GiB`;
}

function Sparkline({
  data,
  width = 300,
  height = 60,
  color = 'var(--color-accent)',
  label,
  current,
  secondaryData,
  secondaryColor,
  secondaryLabel,
  timestamps,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  label: string;
  current: string;
  secondaryData?: number[];
  secondaryColor?: string;
  secondaryLabel?: string;
  timestamps?: number[];
}) {
  if (data.length < 2) {
    return (
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-text-tertiary">{label}</p>
          <p className="text-sm font-mono font-semibold">{current}</p>
        </div>
        <div className="h-[60px] flex items-center justify-center text-xs text-text-tertiary">
          Collecting data...
        </div>
      </div>
    );
  }

  const allValues = secondaryData ? [...data, ...secondaryData] : data;
  const max = Math.max(...allValues, 1);
  const min = Math.min(...allValues, 0);
  const range = max - min || 1;
  const pad = 2;

  function toPoints(values: number[]) {
    return values
      .map((v, i) => {
        const x = pad + (i / (values.length - 1)) * (width - pad * 2);
        const y = pad + (1 - (v - min) / range) * (height - pad * 2);
        return `${x},${y}`;
      })
      .join(' ');
  }

  const points = toPoints(data);
  const secondaryPoints = secondaryData ? toPoints(secondaryData) : null;

  const timeLabels =
    timestamps && timestamps.length >= 2
      ? [formatTime(timestamps[0]), formatTime(timestamps[timestamps.length - 1])]
      : null;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <p className="text-xs text-text-tertiary">{label}</p>
          {secondaryLabel && (
            <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span>{label.split(' ')[0]}</span>
              <span
                className="inline-block w-2 h-2 rounded-full ml-1"
                style={{ backgroundColor: secondaryColor }}
              />
              <span>{secondaryLabel}</span>
            </div>
          )}
        </div>
        <p className="text-sm font-mono font-semibold">{current}</p>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height: `${height}px` }}
        preserveAspectRatio="none"
      >
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {secondaryPoints && (
          <polyline
            points={secondaryPoints}
            fill="none"
            stroke={secondaryColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeDasharray="3,2"
          />
        )}
      </svg>
      {timeLabels && (
        <div className="flex justify-between text-[10px] text-text-tertiary mt-1">
          <span>{timeLabels[0]}</span>
          <span>{timeLabels[1]}</span>
        </div>
      )}
    </div>
  );
}

export default function Component() {
  const { deployment } = useOutletContext<DetailContext>();
  const name = deployment.name;
  const [stats, setStats] = useState<Stats | null>(null);
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const data = await fetchContainerStats(name);
      if (!data) {
        setError('not running');
        return;
      }
      setStats(data as Stats);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    }
  }, [name]);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await fetchMetricsHistory(name, 60);
      setMetrics(data as MetricPoint[]);
    } catch {
      // may not have data yet
    }
  }, [name]);

  // Initial fetch of current stats and history
  useEffect(() => {
    fetchStats();
    fetchHistory();
  }, [fetchStats, fetchHistory]);

  // WebSocket for real-time metrics updates
  const channels = useMemo(() => [`deployment:${name}`], [name]);
  const handleWsEvent = useCallback((event: { type: string; data: Record<string, unknown> }) => {
    if (event.type === 'metrics:update') {
      const point = event.data as unknown as MetricPoint;
      setMetrics((prev) => {
        const cutoff = Date.now() - 60 * 60_000;
        return [...prev.filter((m) => m.timestamp >= cutoff), point];
      });
      // Format current stats from the raw metrics
      setStats({
        cpu: `${point.cpuPercent.toFixed(2)}%`,
        mem: formatBytes(point.memUsageBytes) + ' / ' + formatBytes(point.memLimitBytes),
        memPerc: `${point.memPercent.toFixed(1)}%`,
        net: formatBytes(point.netRxBytes) + ' / ' + formatBytes(point.netTxBytes),
        block: formatBytes(point.blockReadBytes) + ' / ' + formatBytes(point.blockWriteBytes),
        pids: String(point.pids),
      });
      setError('');
    }
  }, []);
  useWebSocket(channels, handleWsEvent);

  if (error) {
    return (
      <div className="card p-6 text-center text-sm text-text-secondary">
        Container is not running. Resources are unavailable.
      </div>
    );
  }

  if (!stats) {
    return <div className="text-sm text-text-tertiary text-center py-8">Loading stats...</div>;
  }

  const cpuData = metrics.map((m) => m.cpuPercent);
  const memData = metrics.map((m) => m.memUsageBytes);
  const netRxData = metrics.map((m) => m.netRxBytes);
  const netTxData = metrics.map((m) => m.netTxBytes);
  const blockReadData = metrics.map((m) => m.blockReadBytes);
  const blockWriteData = metrics.map((m) => m.blockWriteBytes);
  const timestamps = metrics.map((m) => m.timestamp);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-text-tertiary mb-1">CPU</p>
          <p className="text-lg font-semibold font-mono">{stats.cpu}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-tertiary mb-1">Memory</p>
          <p className="text-lg font-semibold font-mono">{stats.mem}</p>
          <p className="text-xs text-text-secondary mt-0.5">{stats.memPerc}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-tertiary mb-1">PIDs</p>
          <p className="text-lg font-semibold font-mono">{stats.pids}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Sparkline
          data={cpuData}
          color="var(--color-accent)"
          label="CPU %"
          current={stats.cpu}
          timestamps={timestamps}
        />
        <Sparkline
          data={memData}
          color="var(--color-success)"
          label="Memory"
          current={stats.mem}
          timestamps={timestamps}
        />
        <Sparkline
          data={netRxData}
          secondaryData={netTxData}
          color="var(--color-accent)"
          secondaryColor="var(--color-warning)"
          label="Network RX"
          secondaryLabel="TX"
          current={stats.net}
          timestamps={timestamps}
        />
        <Sparkline
          data={blockReadData}
          secondaryData={blockWriteData}
          color="var(--color-accent)"
          secondaryColor="var(--color-warning)"
          label="Disk Read"
          secondaryLabel="Write"
          current={stats.block}
          timestamps={timestamps}
        />
      </div>
    </div>
  );
}
