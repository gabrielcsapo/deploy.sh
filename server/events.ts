import { EventEmitter } from 'node:events';

export interface DeployEvent {
  type: string;
  deploymentName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
}

const emitter = new EventEmitter();
emitter.setMaxListeners(100);

export function emit(event: DeployEvent) {
  emitter.emit('event', event);
}

export function on(handler: (event: DeployEvent) => void) {
  emitter.on('event', handler);
  return () => emitter.off('event', handler);
}

// ── Active build tracking ────────────────────────────────────────────────────
// In-memory store for builds in progress so page refreshes can pick them up

const activeBuilds = new Map<string, string>();

export function setActiveBuild(name: string, output: string) {
  activeBuilds.set(name, output);
}

export function appendActiveBuild(name: string, line: string, timestamp: string) {
  activeBuilds.set(name, (activeBuilds.get(name) || '') + `[${timestamp}] ${line}\n`);
}

export function clearActiveBuild(name: string) {
  activeBuilds.delete(name);
}

export function getActiveBuild(name: string): string | null {
  return activeBuilds.get(name) ?? null;
}
