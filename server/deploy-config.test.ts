import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { compileLegacyDeployConfig } from './application-spec.ts';
import { readDeployConfig, readDeploymentDefinition } from './deploy-config.ts';

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function config(value: unknown) {
  return readDeployConfig(project({ 'deploy.json': JSON.stringify(value) }));
}

function project(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'deploy-config-'));
  dirs.push(dir);
  for (const [name, source] of Object.entries(files)) writeFileSync(join(dir, name), source);
  return dir;
}

const SIMPLE_YAML = `apiVersion: deploy.local/v1
kind: Application
components:
  web:
    build:
      context: .
    role: web
    interfaces:
      http:
        port: 8080
        protocol: http
routes:
  public:
    to: web.http
`;

describe('deployment definition discovery', () => {
  it('discovers and compiles deploy.yaml', () => {
    const definition = readDeploymentDefinition(project({ 'deploy.yaml': SIMPLE_YAML }));

    assert.equal(definition.format, 'deploy.yaml');
    assert.equal(definition.source, SIMPLE_YAML);
    assert.equal(definition.compiled.spec.apiVersion, 'deploy.local/v1');
    assert.equal(definition.compiled.spec.components.web.interfaces.http.port, 8080);
    assert.match(definition.compiled.digest, /^sha256:[a-f0-9]{64}$/);
    assert.equal(definition.legacyRuntime?.deployConfig.port, 8080);
  });

  it('rejects ambiguous deploy.yaml and deploy.json projects', () => {
    const dir = project({ 'deploy.yaml': SIMPLE_YAML, 'deploy.json': '{"port":3000}' });

    assert.throws(
      () => readDeploymentDefinition(dir),
      /Both deploy\.yaml and deploy\.json exist\. Keep one deployment manifest/,
    );
    assert.throws(() => readDeployConfig(dir), /deploy\.local will not choose between them/);
  });

  it('compiles legacy and zero-config projects into the same v1 model', () => {
    const legacyConfig = {
      port: 4000,
      discoverable: true,
      ports: [{ container: 2222, protocol: 'tcp' }],
    };
    const legacy = readDeploymentDefinition(
      project({ 'deploy.json': JSON.stringify(legacyConfig) }),
    );
    const generated = readDeploymentDefinition(project({ 'index.js': '' }));

    assert.equal(legacy.format, 'deploy.json');
    assert.deepEqual(legacy.legacyRuntime?.deployConfig, legacyConfig);
    assert.deepEqual(legacy.compiled, compileLegacyDeployConfig(legacyConfig));
    assert.equal(generated.format, 'generated');
    assert.equal(generated.source, null);
    assert.deepEqual(generated.legacyRuntime?.deployConfig, {});
    assert.deepEqual(generated.compiled, compileLegacyDeployConfig({}));
  });
});

describe('deploy.yaml single-container runtime adapter', () => {
  it('adapts a simple build component without dropping supported intent', () => {
    const definition = readDeploymentDefinition(
      project({
        'deploy.yaml': `apiVersion: deploy.local/v1
kind: Application
configuration:
  apiToken:
    type: secret
    required: true
components:
  app:
    build:
      context: .
      ignore: [docs]
    role: web
    interfaces:
      http:
        port: 8080
        protocol: http
      metrics:
        port: 9090
        protocol: tcp
      dns:
        port: 5353
        protocol: udp
    environment:
      API_TOKEN:
        from: configuration.apiToken
    mounts:
      /srv/files:
        resource: files
        readOnly: true
    runtime:
      gpus: true
      privilegedDocker: true
      runArgs: [--dns, 172.30.0.10]
      networks:
        - name: app-network
          subnet: 172.30.0.0/24
          labels:
            com.example.scope: private
resources:
  files:
    type: volume
    source:
      type: bind
      hostPath: /srv/app-files
routes:
  public:
    to: app.http
    discoverable: true
    cache:
      paths: [/assets/*]
`,
      }),
    );

    assert.deepEqual(definition.legacyRuntime, {
      componentName: 'app',
      environment: { API_TOKEN: { from: 'configuration.apiToken' } },
      deployConfig: {
        port: 8080,
        ports: [
          { container: 5353, protocol: 'udp' },
          { container: 9090, protocol: 'tcp' },
        ],
        discoverable: true,
        volumes: [{ hostPath: '/srv/app-files', containerPath: '/srv/files', readOnly: true }],
        ignore: ['docs'],
        cache: {
          enabled: true,
          maxAge: 60,
          paths: ['/assets/*'],
          maxObjectBytes: 2 * 1024 * 1024,
        },
        gpus: true,
        privilegedDocker: true,
        docker: {
          runArgs: ['--dns', '172.30.0.10'],
          networks: [
            {
              name: 'app-network',
              subnet: '172.30.0.0/24',
              labels: { 'com.example.scope': 'private' },
            },
          ],
        },
      },
    });
    assert.deepEqual(readDeployConfig(project({ 'deploy.yaml': SIMPLE_YAML })), {
      port: 8080,
      discoverable: false,
      gpus: false,
      privilegedDocker: false,
    });
  });

  it('routes graph features to the graph executor while still rejecting unsafe Docker overrides', () => {
    const graphManifests = [
      {
        source: `apiVersion: deploy.local/v1
kind: Application
components:
  web:
    build: { context: . }
    interfaces:
      http: { port: 3000, protocol: http }
  worker:
    build: { context: . }
routes:
  public: { to: web.http }
`,
      },
      {
        source: SIMPLE_YAML.replace('role: web', 'role: web\n    instances: 2'),
      },
      {
        source: SIMPLE_YAML.replace('build:\n      context: .', 'image: example/app:1'),
      },
      {
        source: SIMPLE_YAML.replace('role: web', 'role: web\n    profile: deploy.local/example@1'),
      },
      {
        source: SIMPLE_YAML.replace(
          'routes:',
          'jobs:\n  migrate:\n    component: web\n    command: [npm, run, migrate]\nroutes:',
        ),
      },
      {
        source: SIMPLE_YAML.replace(
          'routes:\n  public:',
          'resources:\n  data:\n    type: volume\nroutes:\n  public:',
        ),
      },
      {
        source: SIMPLE_YAML.replace('public:', 'internal:'),
      },
    ];

    for (const { source } of graphManifests) {
      const definition = readDeploymentDefinition(project({ 'deploy.yaml': source }));
      assert.equal(definition.format, 'deploy.yaml');
      assert.equal(definition.legacyRuntime, null);
    }
    assert.throws(
      () =>
        readDeploymentDefinition(
          project({
            'deploy.yaml': SIMPLE_YAML.replace(
              'role: web',
              'role: web\n    runtime:\n      runArgs: [--name, unsafe]',
            ),
          }),
        ),
      /cannot use Docker argument "--name"/,
    );
  });
});

describe('deploy.json cache policy', () => {
  it('applies safe defaults', () => {
    assert.deepEqual(config({ cache: { paths: ['/assets/*'] } }).cache, {
      enabled: true,
      maxAge: 60,
      paths: ['/assets/*'],
      maxObjectBytes: 2 * 1024 * 1024,
    });
  });

  it('rejects relative paths and excessive object sizes', () => {
    assert.throws(() => config({ cache: { paths: ['assets/*'] } }), /absolute path patterns/);
    assert.throws(
      () => config({ cache: { paths: ['/'], maxObjectBytes: 20 * 1024 * 1024 } }),
      /maxObjectBytes/,
    );
  });
});

describe('deploy.json Docker options', () => {
  it('parses declarative networks and exact run arguments', () => {
    assert.deepEqual(
      config({
        docker: {
          networks: [
            {
              name: 'groffee-ci',
              subnet: '172.30.0.0/24',
              labels: { 'com.groffee.egress': 'restricted' },
            },
          ],
          runArgs: ['--dns', '172.30.0.10'],
        },
      }).docker,
      {
        networks: [
          {
            name: 'groffee-ci',
            driver: undefined,
            subnet: '172.30.0.0/24',
            labels: { 'com.groffee.egress': 'restricted' },
          },
        ],
        runArgs: ['--dns', '172.30.0.10'],
      },
    );
  });

  it('rejects invalid networks and untyped Docker capability overrides', () => {
    assert.throws(
      () => config({ docker: { networks: [{ name: '../unsafe' }] } }),
      /name is invalid/,
    );
    for (const runArgs of [
      ['--name', 'other'],
      ['--privileged'],
      ['-v', '/:/host'],
      ['--mount=type=bind,src=/,dst=/host'],
      ['--pid=host'],
      ['--network=host'],
      ['--env', 'TOKEN=secret'],
      ['--gpus=all'],
      ['--memory=8g'],
      ['--cpus=8'],
    ]) {
      assert.throws(
        () => config({ docker: { runArgs } }),
        /declare ports, mounts, networks, environment, devices, privileges, GPU, and resource limits/,
      );
    }
  });

  it('rejects overrides of deploy.local container identity labels', () => {
    for (const runArgs of [
      ['--label', 'deploy-sh.app=other'],
      ['-l', 'deploy-sh.host-port=65535'],
      ['--label=deploy-sh.app=other'],
    ]) {
      assert.throws(() => config({ docker: { runArgs } }), /cannot override reserved Docker label/);
    }
  });
});
