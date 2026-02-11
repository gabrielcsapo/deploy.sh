import { networkInterfaces } from 'node:os';
import multicastDns from 'multicast-dns';
import { getAllDeployments } from './store.ts';

// ── Local IP detection ──────────────────────────────────────────────────────

function getLocalIPv4(): string {
  const interfaces = networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// ── mDNS hostname registry ──────────────────────────────────────────────────

const registeredHosts = new Set<string>();
let mdns: ReturnType<typeof multicastDns> | null = null;

function ensureMdns() {
  if (mdns) return mdns;
  const ip = getLocalIPv4();
  mdns = multicastDns();

  mdns.on('query', (query) => {
    const answers: Array<{ name: string; type: 'A'; ttl: number; data: string }> = [];

    for (const q of query.questions) {
      if ((q.type === 'A' || (q.type as string) === 'ANY') && registeredHosts.has(q.name)) {
        answers.push({ name: q.name, type: 'A', ttl: 120, data: ip });
      }
    }

    if (answers.length > 0) {
      mdns!.respond({ answers });
    }
  });

  return mdns;
}

export function registerHost(name: string) {
  const hostname = `${name.toLowerCase()}.local`;
  if (registeredHosts.has(hostname)) return;

  registeredHosts.add(hostname);
  const m = ensureMdns();
  const ip = getLocalIPv4();

  // Proactive announcement so clients discover it immediately
  m.respond({
    answers: [{ name: hostname, type: 'A', ttl: 120, data: ip }],
  });

  console.log(`mDNS: registered ${hostname} → ${ip}`);
}

export function unregisterHost(name: string) {
  const hostname = `${name.toLowerCase()}.local`;
  registeredHosts.delete(hostname);
  console.log(`mDNS: unregistered ${hostname}`);
}

export function registerAllDeployments() {
  const deployments = getAllDeployments();
  for (const d of deployments) {
    registerHost(d.name);
  }
}
