import { getAllDeployments, updateDeploymentStatus } from './store.ts';
import { getContainerStatus, stopContainer, restartContainer } from './docker.ts';
import { emit } from './events.ts';

/**
 * Sync deployment status from Docker on server startup
 * This ensures the database matches the actual Docker container state
 */
export function syncContainerStates() {
  console.log('Syncing container states...');
  const deployments = getAllDeployments();
  let synced = 0;

  for (const deployment of deployments) {
    try {
      const dockerStatus = getContainerStatus(deployment.name);
      const dbStatus = deployment.status || 'stopped';

      // Update database if status diverged
      if (dockerStatus !== dbStatus) {
        console.log(`  ${deployment.name}: ${dbStatus} -> ${dockerStatus}`);
        updateDeploymentStatus(deployment.name, dockerStatus);
        emit({
          type: 'deployment:status',
          deploymentName: deployment.name,
          data: { status: dockerStatus },
        });
        synced++;
      }
    } catch (err) {
      console.error(`  Error syncing ${deployment.name}:`, err);
    }
  }

  if (synced > 0) {
    console.log(`Container states synced (${synced} updated)`);
  }
}

/**
 * Start all stopped containers
 * Called when deploy.sh starts up
 */
export function startAllContainers() {
  console.log('Starting all containers...');
  const deployments = getAllDeployments();
  let started = 0;

  for (const deployment of deployments) {
    try {
      const status = getContainerStatus(deployment.name);

      if (status === 'exited' || status === 'created') {
        console.log(`  Starting ${deployment.name}...`);

        // Emit "starting" status immediately
        updateDeploymentStatus(deployment.name, 'starting');
        emit({
          type: 'deployment:status',
          deploymentName: deployment.name,
          data: { status: 'starting' },
        });

        // Actually start the container
        restartContainer(deployment.name);

        // Update to running after container starts
        updateDeploymentStatus(deployment.name, 'running');
        emit({
          type: 'deployment:status',
          deploymentName: deployment.name,
          data: { status: 'running' },
        });
        started++;
      }
    } catch (err) {
      console.error(`  Error starting ${deployment.name}:`, err);
    }
  }

  if (started > 0) {
    console.log(`All containers started (${started} total)`);
  }
}

/**
 * Stop all running containers
 * Called when deploy.sh shuts down
 */
export function stopAllContainers() {
  console.log('Stopping all containers...');
  const deployments = getAllDeployments();
  let stopped = 0;

  for (const deployment of deployments) {
    try {
      const status = getContainerStatus(deployment.name);

      if (status === 'running') {
        console.log(`  Stopping ${deployment.name}...`);
        stopContainer(deployment.name);
        updateDeploymentStatus(deployment.name, 'stopped');
        stopped++;
      }
    } catch (err) {
      console.error(`  Error stopping ${deployment.name}:`, err);
    }
  }

  console.log(`All containers stopped (${stopped} total)`);
}
