import { mkdirSync, existsSync, readdirSync, statSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const DATA_DIR = resolve(process.cwd(), '.deploy-data');
const VOLUMES_DIR = resolve(DATA_DIR, 'volumes');
const BACKUPS_DIR = resolve(DATA_DIR, 'backups');

// ── Directory Management ────────────────────────────────────────────────────

export function ensureVolumeDirs() {
  if (!existsSync(VOLUMES_DIR)) mkdirSync(VOLUMES_DIR, { recursive: true });
  if (!existsSync(BACKUPS_DIR)) mkdirSync(BACKUPS_DIR, { recursive: true });
}

export function getVolumeDir(deploymentName: string): string {
  ensureVolumeDirs();
  const volumeDir = resolve(VOLUMES_DIR, deploymentName);

  // Auto-create on first access
  if (!existsSync(volumeDir)) {
    mkdirSync(volumeDir, { recursive: true });
    mkdirSync(resolve(volumeDir, 'data'), { recursive: true });
    mkdirSync(resolve(volumeDir, 'uploads'), { recursive: true });
  }

  return volumeDir;
}

export function getBackupDir(deploymentName: string): string {
  ensureVolumeDirs();
  const backupDir = resolve(BACKUPS_DIR, deploymentName);
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });
  return backupDir;
}

// ── Backup Operations ───────────────────────────────────────────────────────

export function createBackup(
  deploymentName: string,
  label?: string,
): { filename: string; sizeBytes: number; timestamp: string } {
  const volumeDir = getVolumeDir(deploymentName);
  const backupDir = getBackupDir(deploymentName);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const labelSuffix = label ? `-${label.replace(/[^a-zA-Z0-9-]/g, '_')}` : '';
  const filename = `${timestamp}${labelSuffix}.tar.gz`;
  const backupPath = resolve(backupDir, filename);

  // Create tarball from volume directory
  execSync(
    `tar -czf ${JSON.stringify(backupPath)} -C ${JSON.stringify(volumeDir)} data uploads`,
    { stdio: 'pipe' },
  );

  const stats = statSync(backupPath);

  return {
    filename,
    sizeBytes: stats.size,
    timestamp: new Date().toISOString(),
  };
}

export function restoreBackup(deploymentName: string, filename: string): void {
  const volumeDir = getVolumeDir(deploymentName);
  const backupDir = getBackupDir(deploymentName);
  const backupPath = resolve(backupDir, filename);

  if (!existsSync(backupPath)) {
    throw new Error('Backup file not found');
  }

  // Clear existing volumes (REPLACE strategy)
  rmSync(volumeDir, { recursive: true, force: true });
  mkdirSync(volumeDir, { recursive: true });

  // Extract tarball
  execSync(`tar -xzf ${JSON.stringify(backupPath)} -C ${JSON.stringify(volumeDir)}`, {
    stdio: 'pipe',
  });
}

export function listBackupFiles(deploymentName: string) {
  const backupDir = getBackupDir(deploymentName);
  if (!existsSync(backupDir)) return [];

  const files = readdirSync(backupDir)
    .filter((f) => f.endsWith('.tar.gz'))
    .map((filename) => {
      const stats = statSync(resolve(backupDir, filename));
      return {
        filename,
        sizeBytes: stats.size,
        modifiedAt: stats.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));

  return files;
}

export function deleteBackupFile(deploymentName: string, filename: string): void {
  const backupPath = resolve(getBackupDir(deploymentName), filename);
  if (existsSync(backupPath)) {
    rmSync(backupPath);
  }
}

// ── Volume Lifecycle ────────────────────────────────────────────────────────

export function deleteVolumes(deploymentName: string): void {
  const volumeDir = resolve(VOLUMES_DIR, deploymentName);

  // Only delete volumes, NOT backups (user preference)
  if (existsSync(volumeDir)) rmSync(volumeDir, { recursive: true, force: true });
}

export function getVolumeSize(deploymentName: string): number {
  const volumeDir = getVolumeDir(deploymentName);

  try {
    const result = execSync(`du -sb ${JSON.stringify(volumeDir)}`, { stdio: 'pipe' })
      .toString()
      .trim();
    return parseInt(result.split('\t')[0], 10);
  } catch {
    return 0;
  }
}
