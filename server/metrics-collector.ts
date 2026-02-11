import { getAllDeployments, logMetrics, updateDeploymentStatus } from './store.ts';
import { getContainerStatsRaw, getContainerStatus } from './docker.ts';
import { emit } from './events.ts';

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
      if (stats) {
        logMetrics(d.name, stats);
        emit({ type: 'metrics:update', deploymentName: d.name, data: stats });
      }

      // Sync deployment status from Docker
      const dockerStatus = getContainerStatus(d.name);
      const dbStatus = d.status || 'stopped';
      // Only sync if status diverged and not in a transitional state
      if (
        dockerStatus !== dbStatus &&
        dbStatus !== 'uploading' &&
        dbStatus !== 'building' &&
        dbStatus !== 'starting'
      ) {
        updateDeploymentStatus(d.name, dockerStatus);
        emit({
          type: 'deployment:status',
          deploymentName: d.name,
          data: { status: dockerStatus },
        });
      }
    }
  } catch {
    // silently ignore — docker may not be available
  }
}
