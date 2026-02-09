import { getAllDeployments, logMetrics } from './store.ts';
import { getContainerStatsRaw } from './docker.ts';

let interval: ReturnType<typeof setInterval> | null = null;

export function startMetricsCollector() {
  if (interval) return;
  collectAll();
  interval = setInterval(collectAll, 30_000);
}

export function stopMetricsCollector() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

function collectAll() {
  try {
    const deployments = getAllDeployments();
    for (const d of deployments) {
      const stats = getContainerStatsRaw(d.name);
      if (stats) logMetrics(d.name, stats);
    }
  } catch {
    // silently ignore — docker may not be available
  }
}
