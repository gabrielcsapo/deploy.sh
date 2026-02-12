/**
 * Database maintenance tasks
 * - Periodic VACUUM operations to reclaim disk space
 * - All data is preserved indefinitely (no automatic cleanup)
 */

import { getSqlite } from './store.ts';

const VACUUM_INTERVAL_MS = 6 * 60 * 60 * 1000; // Run VACUUM every 6 hours

/**
 * Runs SQLite VACUUM to reclaim disk space from deleted records
 * VACUUM rebuilds the database file, repacking it into a minimal amount of disk space
 */
function runVacuum() {
  try {
    const sqlite = getSqlite();
    if (!sqlite) {
      console.warn('SQLite not initialized, skipping VACUUM');
      return;
    }

    const start = Date.now();
    console.log('Starting database VACUUM...');

    sqlite.prepare('VACUUM').run();

    const duration = Date.now() - start;
    console.log(`Database VACUUM completed in ${duration}ms`);
  } catch (err) {
    console.error('VACUUM failed:', err);
  }
}

/**
 * Starts periodic maintenance tasks
 * - VACUUM every 6 hours to reclaim disk space from deleted records
 */
export function startMaintenance() {
  console.log('Starting database maintenance - VACUUM will run every 6 hours');

  // Run VACUUM on startup to reclaim space from any existing deleted records
  runVacuum();

  // Schedule periodic VACUUM
  setInterval(() => {
    runVacuum();
  }, VACUUM_INTERVAL_MS);
}

/**
 * Export for manual maintenance operations
 */
export const maintenance = {
  vacuum: runVacuum,
};
