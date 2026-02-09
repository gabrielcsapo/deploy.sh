'use server';

import { getMetricsHistory } from '../../server/store.ts';
import { getContainerStats } from '../../server/docker.ts';

export async function fetchMetricsHistory(name: string, minutes = 60) {
  const since = Date.now() - minutes * 60_000;
  return getMetricsHistory(name, since);
}

export async function fetchContainerStats(name: string) {
  return getContainerStats(name);
}
