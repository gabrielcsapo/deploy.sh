#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { createReadStream } from 'node:fs';
import { basename, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { homedir } from 'node:os';
import { readFileSync, writeFileSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

const DEFAULT_URL = 'http://localhost';
const RC_PATH = resolve(homedir(), '.deployrc');

function appUrl(serverUrl, name) {
  const u = new URL(serverUrl);
  const hostname = u.hostname;
  // If server is an IP address or localhost, use .local mDNS domain
  if (
    /^\d+\.\d+\.\d+\.\d+$/.test(hostname) ||
    hostname === 'localhost' ||
    hostname.endsWith('.local')
  ) {
    const port = u.port ? `:${u.port}` : '';
    return `${u.protocol}//${name}.local${port}`;
  }
  return `${u.protocol}//${name}.${u.host}`;
}

// ── Config helpers ──────────────────────────────────────────────────────────

function loadConfig() {
  try {
    return JSON.parse(readFileSync(RC_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveConfig(config) {
  writeFileSync(RC_PATH, JSON.stringify(config, null, 2) + '\n');
}

// ── Prompt helper ───────────────────────────────────────────────────────────

function prompt(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    if (hidden) {
      process.stdout.write(question);
      const stdin = process.stdin;
      const originalRawMode = stdin.isRaw;
      if (stdin.isTTY) stdin.setRawMode(true);
      let value = '';
      const onData = (c) => {
        const ch = c.toString();
        if (ch === '\n' || ch === '\r') {
          if (stdin.isTTY) stdin.setRawMode(originalRawMode);
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          rl.close();
          resolve(value);
        } else if (ch === '\u0003') {
          process.exit(1);
        } else if (ch === '\u007f') {
          value = value.slice(0, -1);
        } else {
          value += ch;
        }
      };
      stdin.on('data', onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

// ── HTTP helper ─────────────────────────────────────────────────────────────

async function request(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg = typeof body === 'object' ? body.message || body.error || text : text;
    throw new Error(`${res.status}: ${msg}`);
  }
  return body;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

async function uploadWithProgress(url, body, headers) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const requestFn = isHttps ? httpsRequest : httpRequest;

    const totalBytes = body.length;
    let uploadedBytes = 0;
    const startTime = Date.now();

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': totalBytes,
      },
    };

    const req = requestFn(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        let responseBody;
        try {
          responseBody = JSON.parse(text);
        } catch {
          responseBody = text;
        }
        if (res.statusCode >= 400) {
          const msg =
            typeof responseBody === 'object'
              ? responseBody.message || responseBody.error || text
              : text;
          reject(new Error(`${res.statusCode}: ${msg}`));
        } else {
          resolve(responseBody);
        }
      });
    });

    req.on('error', reject);

    // Track upload progress
    const chunkSize = 64 * 1024; // 64KB chunks
    let offset = 0;

    const writeNextChunk = () => {
      if (offset >= totalBytes) {
        req.end();
        process.stdout.write('\nUpload complete, building Docker image...');
        // Add a simple spinner while waiting for server response
        const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        let spinnerIndex = 0;
        const spinnerInterval = setInterval(() => {
          process.stdout.write(`\r${spinnerFrames[spinnerIndex]} Building Docker image...`);
          spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
        }, 80);

        // Clear spinner when request completes
        req.on('close', () => {
          clearInterval(spinnerInterval);
          process.stdout.write('\r\x1b[K'); // Clear the spinner line
        });
        return;
      }

      const end = Math.min(offset + chunkSize, totalBytes);
      const chunk = body.subarray(offset, end);

      const canContinue = req.write(chunk);
      uploadedBytes += chunk.length;
      offset = end;

      // Update progress
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = uploadedBytes / elapsed;
      const percentage = ((uploadedBytes / totalBytes) * 100).toFixed(1);
      const progress = `Uploading... ${formatBytes(uploadedBytes)} / ${formatBytes(totalBytes)} (${percentage}%) - ${formatBytes(speed)}/s`;
      process.stdout.write(`\r${progress}`);

      if (canContinue) {
        writeNextChunk();
      } else {
        req.once('drain', writeNextChunk);
      }
    };

    writeNextChunk();
  });
}

function authHeaders(config) {
  return {
    'x-deploy-username': config.username || '',
    'x-deploy-token': config.token || '',
  };
}

// ── Commands ────────────────────────────────────────────────────────────────

async function cmdRegister(serverUrl) {
  const username = await prompt('Username: ');
  const password = await prompt('Password: ', true);

  const res = await request(`${serverUrl}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  saveConfig({ ...loadConfig(), username, token: res.token, url: serverUrl });
  console.log(`Registered and logged in as ${username}`);
}

async function cmdLogin(serverUrl) {
  const username = await prompt('Username: ');
  const password = await prompt('Password: ', true);

  const res = await request(`${serverUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  saveConfig({ ...loadConfig(), username, token: res.token, url: serverUrl });
  console.log(`Logged in as ${username}`);
}

async function cmdLogout(serverUrl) {
  const config = loadConfig();
  await request(`${serverUrl}/api/logout`, {
    headers: authHeaders(config),
  });
  const { token: _, ...rest } = config;
  saveConfig(rest);
  console.log('Logged out');
}

async function cmdWhoami() {
  const config = loadConfig();
  if (config.username) {
    console.log(config.username);
  } else {
    console.log('Not logged in. Run: deploy register  or  deploy login');
    process.exit(1);
  }
}

async function cmdDeploy(serverUrl, appName) {
  const config = loadConfig();
  if (!config.token) {
    console.error('Not logged in. Run: deploy register  or  deploy login');
    process.exit(1);
  }

  const dir = process.cwd();
  const name = (appName || basename(dir)).toLowerCase();
  const tarball = resolve(dir, `${name}.tar.gz`);

  console.log(`Bundling ${name}...`);
  execSync(`tar -czf ${JSON.stringify(tarball)} --exclude=node_modules --exclude=.git .`, {
    cwd: dir,
    stdio: 'pipe',
  });

  const boundary = '----DeployBoundary' + Date.now();
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${name}.tar.gz"\r\nContent-Type: application/gzip\r\n\r\n`;
  const nameField = `\r\n--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\n${name}\r\n--${boundary}--\r\n`;

  const fileStream = createReadStream(tarball);
  const chunks = [];
  chunks.push(Buffer.from(header));
  for await (const chunk of fileStream) {
    chunks.push(chunk);
  }
  chunks.push(Buffer.from(nameField));
  const body = Buffer.concat(chunks);

  await uploadWithProgress(`${serverUrl}/api/upload`, body, {
    ...authHeaders(config),
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  });

  // Clean up tarball
  try {
    execSync(`rm ${JSON.stringify(tarball)}`, { stdio: 'pipe' });
  } catch {
    // ignore
  }

  console.log(`Deployed ${name}`);
  console.log(`  URL: ${appUrl(serverUrl, name)}`);
}

async function cmdList(serverUrl) {
  const config = loadConfig();
  const deployments = await request(`${serverUrl}/api/deployments`, {
    headers: authHeaders(config),
  });

  if (!deployments.length) {
    console.log('No deployments. Run: deploy  (from a project directory)');
    return;
  }

  console.log('');
  for (const d of deployments) {
    const status = d.status || 'unknown';
    console.log(`  ${d.name}  ${appUrl(serverUrl, d.name)}  [${status}]`);
  }
  console.log('');
}

async function cmdLogs(serverUrl, appName) {
  if (!appName) {
    console.error('Usage: deploy logs -app <name>');
    process.exit(1);
  }
  const config = loadConfig();
  const res = await fetch(`${serverUrl}/api/deployments/${appName}/logs`, {
    headers: authHeaders(config),
  });
  if (!res.ok) {
    console.error(`Error: ${res.status}`);
    process.exit(1);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    process.stdout.write(decoder.decode(value, { stream: true }));
  }
}

async function cmdDelete(serverUrl, appName) {
  if (!appName) {
    console.error('Usage: deploy delete -app <name>');
    process.exit(1);
  }
  const config = loadConfig();
  await request(`${serverUrl}/api/deployments/${appName}`, {
    method: 'DELETE',
    headers: authHeaders(config),
  });
  console.log(`Deleted ${appName}`);
}

async function cmdServer(port) {
  const { spawn } = await import('node:child_process');
  const child = spawn('pnpm', ['run', 'preview', '--', '--port', String(port)], {
    stdio: 'inherit',
    cwd: resolve(import.meta.dirname, '..'),
  });
  child.on('exit', (code) => process.exit(code ?? 0));
  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
}

async function cmdOpen(serverUrl, appName) {
  if (!appName) {
    console.error('Usage: deploy open -app <name>');
    process.exit(1);
  }
  const url = appUrl(serverUrl, appName);
  console.log(`Opening ${url}`);
  const cmd =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  execSync(`${cmd} ${url}`);
}

// ── CLI entry ───────────────────────────────────────────────────────────────

const HELP = `
deploy.sh — self-hosted deployment platform

Usage:
  deploy server              Start the deploy.sh server
  deploy                     Deploy the current directory
  deploy list                List all deployments
  deploy logs -app <name>    Stream logs from a deployment
  deploy delete -app <name>  Delete a deployment
  deploy open -app <name>    Open a deployment in the browser
  deploy register            Create a new account
  deploy login               Authenticate with the server
  deploy logout              Log out
  deploy whoami              Show current user

Options:
  -u, --url <url>            Server URL (default: http://localhost)
  -app, --application <name> Application name
  -p, --port <port>          Server port (default: 80)
  -h, --help                 Show this help
`.trim();

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    url: { type: 'string', short: 'u', default: DEFAULT_URL },
    application: { type: 'string', short: 'a' },
    app: { type: 'string' },
    port: { type: 'string', short: 'p', default: '80' },
    help: { type: 'boolean', short: 'h', default: false },
  },
  strict: false,
});

if (values.help) {
  console.log(HELP);
  process.exit(0);
}

const command = positionals[0] || 'deploy';
const serverUrl = values.url;
const appName = (values.application || values.app)?.toLowerCase();

try {
  switch (command) {
    case 'server':
    case 'start':
      await cmdServer(values.port);
      break;
    case 'deploy':
    case 'd':
      await cmdDeploy(serverUrl, appName);
      break;
    case 'list':
    case 'ls':
      await cmdList(serverUrl);
      break;
    case 'logs':
    case 'l':
      await cmdLogs(serverUrl, appName);
      break;
    case 'delete':
    case 'rm':
      await cmdDelete(serverUrl, appName);
      break;
    case 'open':
    case 'o':
      await cmdOpen(serverUrl, appName);
      break;
    case 'register':
    case 'r':
      await cmdRegister(serverUrl);
      break;
    case 'login':
      await cmdLogin(serverUrl);
      break;
    case 'logout':
      await cmdLogout(serverUrl);
      break;
    case 'whoami':
    case 'who':
    case 'me':
      await cmdWhoami();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
