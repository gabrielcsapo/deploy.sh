/**
 * Low level multicast-dns implementation in TypeScript.
 * Vendored and converted from https://github.com/mafintosh/multicast-dns (MIT)
 */

import * as packet from 'dns-packet';
import dgram from 'node:dgram';
import { EventEmitter } from 'node:events';
import os from 'node:os';

import type { RemoteInfo, Socket, SocketType } from 'node:dgram';
import type { Packet, Question, Answer, RecordType } from 'dns-packet';

// ── Types ───────────────────────────────────────────────────────────────────

export interface Options {
  port?: number;
  type?: SocketType;
  ip?: string;
  host?: string;
  interface?: string;
  socket?: Socket;
  reuseAddr?: boolean;
  bind?: false | string;
  multicast?: boolean;
  ttl?: number;
  loopback?: boolean;
}

export type FullPacket = Required<Packet>;

export interface QueryPacket extends FullPacket {
  type: 'query';
}

export interface ResponsePacket extends FullPacket {
  type: 'response';
}

export interface QueryOutgoingPacket extends Packet {
  questions: Question[];
}

export interface ResponseOutgoingPacket extends Packet {
  answers: Answer[];
}

export interface RemoteInfoOutgoing {
  port: number;
  address?: string;
  host?: string;
}

type Callback = (error: Error | null, bytes?: number) => void;

export interface MulticastDNS extends EventEmitter {
  send(value: Packet, rinfo?: RemoteInfoOutgoing | null, cb?: Callback): void;
  query(query: string | Question[] | QueryOutgoingPacket, type?: RecordType | null, rinfo?: RemoteInfoOutgoing | null, cb?: Callback): void;
  respond(response: Answer[] | ResponseOutgoingPacket, rinfo?: RemoteInfoOutgoing | null, cb?: Callback): void;
  destroy(cb?: () => void): void;
  update(): void;

  on(event: 'ready', listener: () => void): this;
  on(event: 'packet', listener: (packet: FullPacket, rinfo: RemoteInfo) => void): this;
  on(event: 'query', listener: (query: QueryPacket, rinfo: RemoteInfo) => void): this;
  on(event: 'response', listener: (response: ResponsePacket, rinfo: RemoteInfo) => void): this;
  on(event: 'warning', listener: (err: Error) => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
  on(event: 'networkInterface', listener: () => void): this;
  on(event: string, listener: (...args: unknown[]) => void): this;

  emit(event: 'ready'): boolean;
  emit(event: 'packet', packet: FullPacket, rinfo: RemoteInfo): boolean;
  emit(event: 'query', query: QueryPacket, rinfo: RemoteInfo): boolean;
  emit(event: 'response', response: ResponsePacket, rinfo: RemoteInfo): boolean;
  emit(event: 'warning', err: Error): boolean;
  emit(event: 'error', err: Error): boolean;
  emit(event: 'networkInterface'): boolean;
  emit(event: string | symbol, ...args: unknown[]): boolean;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const noop = () => {};

function defaultInterface(): string {
  const networks = os.networkInterfaces();
  const names = Object.keys(networks);

  for (const name of names) {
    const net = networks[name]!;
    for (const iface of net) {
      if (isIPv4(iface.family) && !iface.internal) {
        if (os.platform() === 'darwin' && name === 'en0') return iface.address;
        return '0.0.0.0';
      }
    }
  }

  return '127.0.0.1';
}

function allInterfaces(): string[] {
  const networks = os.networkInterfaces();
  const names = Object.keys(networks);
  const res: string[] = [];

  for (const name of names) {
    const net = networks[name]!;
    for (const iface of net) {
      if (isIPv4(iface.family)) {
        res.push(iface.address);
        // can only addMembership once per interface
        break;
      }
    }
  }

  return res;
}

function isIPv4(family: string | number): boolean {
  return family === 4 || family === 'IPv4';
}

// ── Main ────────────────────────────────────────────────────────────────────

export default function multicastDns(opts?: Options): MulticastDNS {
  const options = opts ?? {};

  const that = new EventEmitter() as MulticastDNS;
  let port = typeof options.port === 'number' ? options.port : 5353;
  const type = options.type ?? 'udp4';
  const ip = options.ip ?? options.host ?? (type === 'udp4' ? '224.0.0.251' : null);
  const me = { address: ip, port };
  let memberships: Record<string, boolean> = {};
  let destroyed = false;
  let interval: ReturnType<typeof setInterval> | null = null;

  if (type === 'udp6' && (!ip || !options.interface)) {
    throw new Error('For IPv6 multicast you must specify `ip` and `interface`');
  }

  const socket = options.socket ?? dgram.createSocket({
    type,
    reuseAddr: options.reuseAddr !== false,
    toString() {
      return type;
    },
  } as dgram.SocketOptions);

  socket.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EACCES' || err.code === 'EADDRINUSE') that.emit('error', err);
    else that.emit('warning', err);
  });

  socket.on('message', (message: Buffer, rinfo: RemoteInfo) => {
    let decoded: Packet;
    try {
      decoded = packet.decode(message);
    } catch (err) {
      that.emit('warning', err as Error);
      return;
    }

    that.emit('packet', decoded as FullPacket, rinfo);

    if (decoded.type === 'query') that.emit('query', decoded as QueryPacket, rinfo);
    if (decoded.type === 'response') that.emit('response', decoded as ResponsePacket, rinfo);
  });

  socket.on('listening', () => {
    if (!port) port = me.port = socket.address().port;
    if (options.multicast !== false) {
      that.update();
      interval = setInterval(that.update, 5000);
      socket.setMulticastTTL(options.ttl ?? 255);
      socket.setMulticastLoopback(options.loopback !== false);
    }
  });

  // Bind once (replaces thunky)
  let bindDone = false;
  let bindError: Error | null = null;
  let bindQueue: Array<(err: Error | null) => void> | null = [];

  function bind(cb: (err: Error | null) => void) {
    if (bindDone) return cb(bindError);
    if (bindQueue) {
      bindQueue.push(cb);
      if (bindQueue.length > 1) return;
    }

    if (!port || options.bind === false) {
      bindDone = true;
      bindError = null;
      const queue = bindQueue!;
      bindQueue = null;
      for (const fn of queue) fn(null);
      return;
    }

    socket.once('error', onBindError);
    socket.bind(port, options.bind || options.interface, () => {
      socket.removeListener('error', onBindError);
      bindDone = true;
      bindError = null;
      const queue = bindQueue!;
      bindQueue = null;
      for (const fn of queue) fn(null);
    });

    function onBindError(err: Error) {
      bindDone = true;
      bindError = err;
      const queue = bindQueue!;
      bindQueue = null;
      for (const fn of queue) fn(err);
    }
  }

  bind((err) => {
    if (err) return that.emit('error', err);
    that.emit('ready');
  });

  that.send = function (value: Packet, rinfo?: RemoteInfoOutgoing | Callback | null, cb?: Callback) {
    if (typeof rinfo === 'function') return that.send(value, null, rinfo);
    if (!cb) cb = noop;
    if (!rinfo) rinfo = me as RemoteInfoOutgoing;
    else if (!rinfo.host && !rinfo.address) rinfo.address = me.address!;

    const callback = cb;
    bind((err) => {
      if (destroyed) return callback(null);
      if (err) return callback(err);
      const message = packet.encode(value);
      socket.send(message, 0, message.length, rinfo!.port, rinfo!.address ?? rinfo!.host!, callback!);
    });
  };

  that.respond = function (
    res: Answer[] | ResponseOutgoingPacket | RemoteInfoOutgoing | Callback,
    rinfo?: RemoteInfoOutgoing | Callback | null,
    cb?: Callback,
  ) {
    let response = res as Answer[] | ResponseOutgoingPacket;
    if (Array.isArray(response)) response = { answers: response } as ResponseOutgoingPacket;

    (response as Packet).type = 'response';
    (response as Packet).flags = ((response as Packet).flags || 0) | packet.AUTHORITATIVE_ANSWER;
    that.send(response as Packet, rinfo as RemoteInfoOutgoing | null, cb);
  };

  that.query = function (
    q: string | Question[] | QueryOutgoingPacket,
    type?: RecordType | RemoteInfoOutgoing | Callback | null,
    rinfo?: RemoteInfoOutgoing | Callback | null,
    cb?: Callback,
  ) {
    if (typeof type === 'function') return that.query(q, null, null, type);
    if (typeof type === 'object' && type && 'port' in type) return that.query(q, null, type, rinfo as Callback);
    if (typeof rinfo === 'function') return that.query(q, type as RecordType, null, rinfo);
    if (!cb) cb = noop;

    let query: Packet;
    if (typeof q === 'string') query = { type: 'query', questions: [{ name: q, type: (type as RecordType) || 'ANY' }] };
    else if (Array.isArray(q)) query = { type: 'query', questions: q };
    else query = q;

    query.type = 'query';
    that.send(query, rinfo as RemoteInfoOutgoing | null, cb);
  };

  that.destroy = function (cb?: () => void) {
    if (!cb) cb = noop;
    if (destroyed) return process.nextTick(cb);
    destroyed = true;
    if (interval) clearInterval(interval);

    for (const iface in memberships) {
      try {
        socket.dropMembership(ip!, iface);
      } catch {
        // eat it
      }
    }
    memberships = {};
    socket.close(cb);
  };

  that.update = function () {
    const ifaces = options.interface ? ([] as string[]).concat(options.interface) : allInterfaces();
    let updated = false;

    for (const addr of ifaces) {
      if (memberships[addr]) continue;

      try {
        socket.addMembership(ip!, addr);
        memberships[addr] = true;
        updated = true;
      } catch (err) {
        that.emit('warning', err as Error);
      }
    }

    if (updated) {
      try {
        socket.setMulticastInterface(options.interface ?? defaultInterface());
      } catch (err) {
        that.emit('warning', err as Error);
      }
      that.emit('networkInterface');
    }
  };

  return that;
}
