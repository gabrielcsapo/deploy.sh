import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  compileDeployYaml,
  compileLegacyDeployConfig,
  type ApplicationSpec,
  type CompiledApplicationSpec,
  type ValueReference,
} from './application-spec.ts';

export interface PortMapping {
  container: number;
  protocol?: string;
}

export interface VolumeMountConfig {
  hostPath: string;
  containerPath: string;
  readOnly?: boolean;
}

export interface DeployConfig {
  port?: number;
  ports?: PortMapping[];
  discoverable?: boolean;
  gpus?: boolean;
  volumes?: VolumeMountConfig[];
  privilegedDocker?: boolean;
  ignore?: string[];
  cache?: {
    enabled: boolean;
    maxAge: number;
    paths: string[];
    maxObjectBytes: number;
  };
  docker?: {
    runArgs: string[];
    networks: Array<{
      name: string;
      driver?: string;
      subnet?: string;
      labels: Record<string, string>;
    }>;
  };
}

export type DeploymentDefinitionFormat = 'deploy.yaml' | 'deploy.json' | 'generated';

export interface LegacyRuntimeAdapter {
  componentName: string;
  deployConfig: DeployConfig;
  environment: Record<string, ValueReference>;
}

export interface DeploymentDefinition {
  format: DeploymentDefinitionFormat;
  /** Original manifest text. Null means the v1 graph was generated from zero-config defaults. */
  source: string | null;
  compiled: CompiledApplicationSpec;
  /** Present only when the graph can also be executed by the compatibility one-container path. */
  legacyRuntime: LegacyRuntimeAdapter | null;
}

interface DiscoveredManifest {
  format: 'deploy.yaml' | 'deploy.json';
  path: string;
}

const ALLOWED_KEYS = new Set([
  '$schema',
  'port',
  'ports',
  'discoverable',
  'gpus',
  'volumes',
  'privilegedDocker',
  'ignore',
  'cache',
  'docker',
]);
const ALLOWED_PORT_KEYS = new Set(['container', 'protocol']);
const ALLOWED_VOLUME_KEYS = new Set(['hostPath', 'containerPath', 'readOnly']);
const VALID_PROTOCOLS = new Set(['tcp', 'udp']);
const ALLOWED_CACHE_KEYS = new Set(['enabled', 'maxAge', 'paths', 'maxObjectBytes']);
const ALLOWED_DOCKER_KEYS = new Set(['runArgs', 'networks']);
const ALLOWED_NETWORK_KEYS = new Set(['name', 'driver', 'subnet', 'labels']);
const SAFE_DOCKER_RUN_ARGS = new Map<string, 0 | 1>([
  ['--dns', 1],
  ['--dns-search', 1],
  ['--dns-option', 1],
  ['--label', 1],
  ['-l', 1],
  ['--read-only', 0],
  ['--init', 0],
  ['--stop-signal', 1],
  ['--stop-timeout', 1],
]);

export function validateSafeDockerRunArgs(args: string[], path: string): void {
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    const separator = argument.indexOf('=');
    const flag = separator === -1 ? argument : argument.slice(0, separator);
    const arity = SAFE_DOCKER_RUN_ARGS.get(flag);
    if (arity === undefined) {
      throw new Error(
        `${path} cannot use Docker argument "${flag}"; declare ports, mounts, networks, environment, devices, privileges, GPU, and resource limits through their typed fields`,
      );
    }
    if (arity === 0) {
      if (separator !== -1) throw new Error(`${path} argument "${flag}" does not accept a value`);
      continue;
    }
    if (separator !== -1) {
      const value = argument.slice(separator + 1);
      if (value.length === 0) {
        throw new Error(`${path} argument "${flag}" requires a value`);
      }
      validateReservedDockerLabel(flag, value, path);
      continue;
    }
    const value = args[index + 1];
    if (!value || value.startsWith('-')) {
      throw new Error(`${path} argument "${flag}" requires a value`);
    }
    validateReservedDockerLabel(flag, value, path);
    index++;
  }
}

function validateReservedDockerLabel(flag: string, value: string, path: string): void {
  if (flag !== '--label' && flag !== '-l') return;
  const key = value.split('=', 1)[0].toLowerCase();
  if (key.startsWith('deploy-sh.')) {
    throw new Error(`${path} cannot override reserved Docker label "${key}"`);
  }
}

export function readDeployConfig(dir: string): DeployConfig {
  const manifest = discoverDeploymentManifest(dir);
  if (!manifest) return {};
  if (manifest.format === 'deploy.json') {
    return parseDeployConfig(readFileSync(manifest.path, 'utf-8'));
  }
  const definition = readDeploymentDefinition(dir);
  return (
    definition.legacyRuntime?.deployConfig ?? graphCompatibilityConfig(definition.compiled.spec)
  );
}

export function readDeploymentDefinition(dir: string): DeploymentDefinition {
  const manifest = discoverDeploymentManifest(dir);

  if (manifest?.format === 'deploy.yaml') {
    const source = readFileSync(manifest.path, 'utf-8');
    const compiled = compileDeployYaml(source);
    for (const [componentName, component] of Object.entries(compiled.spec.components)) {
      validateSafeDockerRunArgs(
        component.runtime.runArgs,
        `deploy.yaml.components.${componentName}.runtime.runArgs`,
      );
    }
    return {
      format: 'deploy.yaml',
      source,
      compiled,
      legacyRuntime: tryAdaptApplicationSpecToLegacyRuntime(compiled.spec),
    };
  }

  if (manifest?.format === 'deploy.json') {
    const source = readFileSync(manifest.path, 'utf-8');
    const deployConfig = parseDeployConfig(source);
    const compiled = compileLegacyDeployConfig(deployConfig);
    return {
      format: 'deploy.json',
      source,
      compiled,
      legacyRuntime: { componentName: 'main', deployConfig, environment: {} },
    };
  }

  const deployConfig: DeployConfig = {};
  const compiled = compileLegacyDeployConfig(deployConfig);
  return {
    format: 'generated',
    source: null,
    compiled,
    legacyRuntime: { componentName: 'main', deployConfig, environment: {} },
  };
}

function tryAdaptApplicationSpecToLegacyRuntime(
  spec: ApplicationSpec,
): LegacyRuntimeAdapter | null {
  try {
    return adaptApplicationSpecToLegacyRuntime(spec);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith(
        'deploy.yaml cannot be materialized by the current single-container executor:',
      )
    ) {
      return null;
    }
    throw error;
  }
}

/** Compatibility projection used by edge cache discovery; graph execution ignores this object. */
function graphCompatibilityConfig(spec: ApplicationSpec): DeployConfig {
  const publicRoute = spec.routes.public ?? Object.values(spec.routes)[0];
  const components = Object.values(spec.components);
  const config: DeployConfig = {
    discoverable: publicRoute?.discoverable,
    gpus: components.some((component) => component.runtime.gpus),
    privilegedDocker: components.some((component) => component.runtime.privilegedDocker),
  };
  if (publicRoute?.cache)
    config.cache = { ...publicRoute.cache, paths: [...publicRoute.cache.paths] };
  return config;
}

function discoverDeploymentManifest(dir: string): DiscoveredManifest | null {
  const yamlPath = resolve(dir, 'deploy.yaml');
  const jsonPath = resolve(dir, 'deploy.json');
  const hasYaml = existsSync(yamlPath);
  const hasJson = existsSync(jsonPath);

  if (hasYaml && hasJson) {
    throw new Error(
      'Both deploy.yaml and deploy.json exist. Keep one deployment manifest; deploy.local will not choose between them.',
    );
  }
  if (hasYaml) return { format: 'deploy.yaml', path: yamlPath };
  if (hasJson) return { format: 'deploy.json', path: jsonPath };
  return null;
}

export function adaptApplicationSpecToLegacyRuntime(spec: ApplicationSpec): LegacyRuntimeAdapter {
  const unsupported: string[] = [];
  const componentEntries = Object.entries(spec.components);

  if (componentEntries.length !== 1) {
    unsupported.push(
      `the single-container executor requires exactly one component (found ${componentEntries.length})`,
    );
  }
  if (Object.keys(spec.jobs).length > 0) {
    unsupported.push('jobs require the graph executor');
  }
  if (componentEntries.length !== 1) throwUnsupportedGraph(unsupported);

  const [componentName, component] = componentEntries[0];
  if (!component.build) unsupported.push(`component "${componentName}" must use a local build`);
  if (component.image) unsupported.push(`image-only component "${componentName}" is not supported`);
  if (component.profile)
    unsupported.push(`component profile "${component.profile}" is not supported`);
  if (component.instances !== 1) {
    unsupported.push(
      `component "${componentName}" requests ${component.instances} instances; only one is supported`,
    );
  }
  if (component.command) unsupported.push('component command overrides require the graph executor');
  if (component.health) unsupported.push('component health checks require the graph executor');
  if (component.dependsOn.length > 0) {
    unsupported.push('component dependencies require the graph executor');
  }
  if (component.build) {
    if (component.build.context !== '.') unsupported.push('build.context must be "."');
    if (component.build.dockerfile) unsupported.push('custom build.dockerfile is not supported');
    if (component.build.target) unsupported.push('build.target is not supported');
  }
  try {
    validateSafeDockerRunArgs(component.runtime.runArgs, 'runtime.runArgs');
  } catch (error) {
    unsupported.push((error as Error).message);
  }

  for (const [variable, reference] of Object.entries(component.environment)) {
    if (!reference.from.startsWith('configuration.')) {
      unsupported.push(
        `environment variable "${variable}" uses component binding "${reference.from}"; only configuration references are supported`,
      );
    }
  }

  const routeEntries = Object.entries(spec.routes);
  if (routeEntries.length !== 1) {
    unsupported.push(`exactly one HTTP route is required (found ${routeEntries.length})`);
  }

  const publicRoute = spec.routes.public;
  if (routeEntries.length === 1 && !publicRoute) {
    unsupported.push(`the single supported route must be named "public"`);
  }

  let primaryInterfaceName: string | undefined;
  if (publicRoute) {
    const [targetComponent, targetInterface, ...rest] = publicRoute.to.split('.');
    if (rest.length > 0 || targetComponent !== componentName || !targetInterface) {
      unsupported.push(`route "public" must target an interface on component "${componentName}"`);
    } else {
      primaryInterfaceName = targetInterface;
      const primaryInterface = component.interfaces[targetInterface];
      if (!primaryInterface) {
        unsupported.push(`route "public" targets unknown interface "${publicRoute.to}"`);
      } else if (primaryInterface.protocol !== 'http') {
        unsupported.push(`route "public" must target an HTTP interface`);
      }
    }
    if (publicRoute.hostname) unsupported.push('custom route hostnames require the graph executor');
    if (publicRoute.path !== '/') unsupported.push('route paths require the graph executor');
  }

  const volumes: VolumeMountConfig[] = [];
  const mountedResources = new Set<string>();
  for (const [containerPath, mount] of Object.entries(component.mounts)) {
    const resource = spec.resources[mount.resource];
    mountedResources.add(mount.resource);
    if (!resource?.source || resource.source.type !== 'bind') {
      unsupported.push(
        `volume resource "${mount.resource}" must use a bind source for the single-container executor`,
      );
      continue;
    }
    volumes.push({
      hostPath: resource.source.hostPath,
      containerPath,
      readOnly: mount.readOnly || undefined,
    });
  }
  for (const resourceName of Object.keys(spec.resources)) {
    if (!mountedResources.has(resourceName)) {
      unsupported.push(`unused volume resource "${resourceName}" cannot be materialized safely`);
    }
  }

  const primaryInterface = primaryInterfaceName
    ? component.interfaces[primaryInterfaceName]
    : undefined;
  const ports: PortMapping[] = [];
  const seenPorts = new Set<number>();
  if (primaryInterface) seenPorts.add(primaryInterface.port);
  for (const [interfaceName, providedInterface] of Object.entries(component.interfaces)) {
    if (interfaceName === primaryInterfaceName) continue;
    if (seenPorts.has(providedInterface.port)) {
      unsupported.push(
        `interface "${interfaceName}" duplicates container port ${providedInterface.port}`,
      );
      continue;
    }
    seenPorts.add(providedInterface.port);
    ports.push({
      container: providedInterface.port,
      protocol: providedInterface.protocol === 'udp' ? 'udp' : 'tcp',
    });
  }

  if (unsupported.length > 0) throwUnsupportedGraph(unsupported);

  const deployConfig: DeployConfig = {
    port: primaryInterface!.port,
    discoverable: publicRoute!.discoverable,
    gpus: component.runtime.gpus,
    privilegedDocker: component.runtime.privilegedDocker,
  };
  if (ports.length > 0) deployConfig.ports = ports;
  if (volumes.length > 0) deployConfig.volumes = volumes;
  if (component.build!.ignore.length > 0) deployConfig.ignore = [...component.build!.ignore];
  if (publicRoute!.cache) {
    deployConfig.cache = { ...publicRoute!.cache, paths: [...publicRoute!.cache.paths] };
  }
  if (component.runtime.runArgs.length > 0 || component.runtime.networks.length > 0) {
    deployConfig.docker = {
      runArgs: [...component.runtime.runArgs],
      networks: component.runtime.networks.map((network) => ({
        ...network,
        labels: { ...network.labels },
      })),
    };
  }

  return {
    componentName,
    deployConfig,
    environment: Object.fromEntries(
      Object.entries(component.environment).map(([key, value]) => [key, { ...value }]),
    ),
  };
}

function throwUnsupportedGraph(issues: string[]): never {
  throw new Error(
    `deploy.yaml cannot be materialized by the current single-container executor:\n- ${issues.join('\n- ')}`,
  );
}

function parseDeployConfig(source: string): DeployConfig {
  const raw = JSON.parse(source);

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('deploy.json must be a JSON object');
  }

  for (const key of Object.keys(raw)) {
    if (!ALLOWED_KEYS.has(key)) {
      throw new Error(`deploy.json: unknown field "${key}"`);
    }
  }

  const config: DeployConfig = {};

  if (raw.port !== undefined) {
    if (
      typeof raw.port !== 'number' ||
      !Number.isInteger(raw.port) ||
      raw.port < 1 ||
      raw.port > 65535
    ) {
      throw new Error('deploy.json: "port" must be an integer between 1 and 65535');
    }
    config.port = raw.port;
  }

  if (raw.ports !== undefined) {
    if (!Array.isArray(raw.ports)) {
      throw new Error('deploy.json: "ports" must be an array');
    }
    config.ports = raw.ports.map((entry: unknown, i: number) => {
      if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
        throw new Error(`deploy.json: ports[${i}] must be an object`);
      }
      const obj = entry as Record<string, unknown>;
      for (const key of Object.keys(obj)) {
        if (!ALLOWED_PORT_KEYS.has(key)) {
          throw new Error(`deploy.json: ports[${i}] has unknown field "${key}"`);
        }
      }
      if (
        typeof obj.container !== 'number' ||
        !Number.isInteger(obj.container) ||
        obj.container < 1 ||
        obj.container > 65535
      ) {
        throw new Error(
          `deploy.json: ports[${i}].container must be an integer between 1 and 65535`,
        );
      }
      if (
        obj.protocol !== undefined &&
        (typeof obj.protocol !== 'string' || !VALID_PROTOCOLS.has(obj.protocol))
      ) {
        throw new Error(`deploy.json: ports[${i}].protocol must be "tcp" or "udp"`);
      }
      return {
        container: obj.container,
        protocol: (obj.protocol as string) || undefined,
      };
    });
  }

  if (raw.discoverable !== undefined) {
    if (typeof raw.discoverable !== 'boolean') {
      throw new Error('deploy.json: "discoverable" must be a boolean');
    }
    config.discoverable = raw.discoverable;
  }

  if (raw.gpus !== undefined) {
    if (typeof raw.gpus !== 'boolean') {
      throw new Error('deploy.json: "gpus" must be a boolean');
    }
    config.gpus = raw.gpus;
  }

  if (raw.volumes !== undefined) {
    if (!Array.isArray(raw.volumes)) {
      throw new Error('deploy.json: "volumes" must be an array');
    }
    config.volumes = raw.volumes.map((entry: unknown, i: number) => {
      if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
        throw new Error(`deploy.json: volumes[${i}] must be an object`);
      }
      const obj = entry as Record<string, unknown>;
      for (const key of Object.keys(obj)) {
        if (!ALLOWED_VOLUME_KEYS.has(key)) {
          throw new Error(`deploy.json: volumes[${i}] has unknown field "${key}"`);
        }
      }
      if (typeof obj.hostPath !== 'string' || obj.hostPath.length === 0) {
        throw new Error(`deploy.json: volumes[${i}].hostPath must be a non-empty string`);
      }
      if (typeof obj.containerPath !== 'string' || obj.containerPath.length === 0) {
        throw new Error(`deploy.json: volumes[${i}].containerPath must be a non-empty string`);
      }
      if (obj.readOnly !== undefined && typeof obj.readOnly !== 'boolean') {
        throw new Error(`deploy.json: volumes[${i}].readOnly must be a boolean`);
      }
      return {
        hostPath: obj.hostPath,
        containerPath: obj.containerPath,
        readOnly: (obj.readOnly as boolean) || undefined,
      };
    });
  }

  if (raw.privilegedDocker !== undefined) {
    if (typeof raw.privilegedDocker !== 'boolean') {
      throw new Error('deploy.json: "privilegedDocker" must be a boolean');
    }
    config.privilegedDocker = raw.privilegedDocker;
  }

  if (raw.ignore !== undefined) {
    if (!Array.isArray(raw.ignore)) {
      throw new Error('deploy.json: "ignore" must be an array of strings');
    }
    for (let i = 0; i < raw.ignore.length; i++) {
      if (typeof raw.ignore[i] !== 'string' || raw.ignore[i].length === 0) {
        throw new Error(`deploy.json: ignore[${i}] must be a non-empty string`);
      }
    }
    config.ignore = raw.ignore;
  }

  if (raw.cache !== undefined) {
    if (typeof raw.cache !== 'object' || raw.cache === null || Array.isArray(raw.cache)) {
      throw new Error('deploy.json: "cache" must be an object');
    }
    for (const key of Object.keys(raw.cache)) {
      if (!ALLOWED_CACHE_KEYS.has(key))
        throw new Error(`deploy.json: cache has unknown field "${key}"`);
    }
    const cache = raw.cache as Record<string, unknown>;
    if (cache.enabled !== undefined && typeof cache.enabled !== 'boolean') {
      throw new Error('deploy.json: cache.enabled must be a boolean');
    }
    const maxAge = cache.maxAge ?? 60;
    if (typeof maxAge !== 'number' || !Number.isInteger(maxAge) || maxAge < 1 || maxAge > 86400) {
      throw new Error('deploy.json: cache.maxAge must be an integer between 1 and 86400');
    }
    const paths = cache.paths ?? [];
    if (
      !Array.isArray(paths) ||
      paths.some((path) => typeof path !== 'string' || !path.startsWith('/'))
    ) {
      throw new Error('deploy.json: cache.paths must be an array of absolute path patterns');
    }
    const maxObjectBytes = cache.maxObjectBytes ?? 2 * 1024 * 1024;
    if (
      typeof maxObjectBytes !== 'number' ||
      !Number.isInteger(maxObjectBytes) ||
      maxObjectBytes < 1024 ||
      maxObjectBytes > 16 * 1024 * 1024
    ) {
      throw new Error('deploy.json: cache.maxObjectBytes must be between 1024 and 16777216');
    }
    config.cache = {
      enabled: cache.enabled !== false,
      maxAge,
      paths: paths as string[],
      maxObjectBytes,
    };
  }

  if (raw.docker !== undefined) {
    if (typeof raw.docker !== 'object' || raw.docker === null || Array.isArray(raw.docker)) {
      throw new Error('deploy.json: "docker" must be an object');
    }
    for (const key of Object.keys(raw.docker)) {
      if (!ALLOWED_DOCKER_KEYS.has(key))
        throw new Error(`deploy.json: docker has unknown field "${key}"`);
    }
    const docker = raw.docker as Record<string, unknown>;
    const runArgs = docker.runArgs ?? [];
    if (
      !Array.isArray(runArgs) ||
      runArgs.some((arg) => typeof arg !== 'string' || arg.length === 0)
    ) {
      throw new Error('deploy.json: docker.runArgs must be an array of non-empty strings');
    }
    validateSafeDockerRunArgs(runArgs as string[], 'deploy.json: docker.runArgs');
    const networks = docker.networks ?? [];
    if (!Array.isArray(networks)) throw new Error('deploy.json: docker.networks must be an array');
    const parsedNetworks = networks.map((entry: unknown, index: number) => {
      if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
        throw new Error(`deploy.json: docker.networks[${index}] must be an object`);
      }
      const network = entry as Record<string, unknown>;
      for (const key of Object.keys(network)) {
        if (!ALLOWED_NETWORK_KEYS.has(key))
          throw new Error(`deploy.json: docker.networks[${index}] has unknown field "${key}"`);
      }
      if (
        typeof network.name !== 'string' ||
        !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(network.name)
      ) {
        throw new Error(`deploy.json: docker.networks[${index}].name is invalid`);
      }
      if (
        network.driver !== undefined &&
        (typeof network.driver !== 'string' || !/^[a-zA-Z0-9_.-]+$/.test(network.driver))
      ) {
        throw new Error(`deploy.json: docker.networks[${index}].driver is invalid`);
      }
      if (
        network.subnet !== undefined &&
        (typeof network.subnet !== 'string' || !/^[0-9a-fA-F:.]+\/\d{1,3}$/.test(network.subnet))
      ) {
        throw new Error(`deploy.json: docker.networks[${index}].subnet must be CIDR notation`);
      }
      const labels = network.labels ?? {};
      if (
        typeof labels !== 'object' ||
        labels === null ||
        Array.isArray(labels) ||
        Object.entries(labels).some(([key, value]) => !key || typeof value !== 'string')
      ) {
        throw new Error(`deploy.json: docker.networks[${index}].labels must be a string map`);
      }
      return {
        name: network.name,
        driver: network.driver as string | undefined,
        subnet: network.subnet as string | undefined,
        labels: labels as Record<string, string>,
      };
    });
    config.docker = { runArgs: runArgs as string[], networks: parsedNetworks };
  }

  return config;
}
