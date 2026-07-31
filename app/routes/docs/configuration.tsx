import { Link } from 'react-flight-router/client';
import schema from '../../../deploy.schema.json';

function formatType(prop: Record<string, unknown>): string {
  if (prop.type === 'array') {
    const items = prop.items as Record<string, unknown> | undefined;
    if (items?.type === 'string') return 'string[]';
    if (items?.type === 'object') return 'array';
    return 'array';
  }
  if (prop.type === 'integer') return 'number';
  return prop.type as string;
}

function formatDefault(prop: Record<string, unknown>): string {
  if (prop.default === undefined) return '—';
  if (typeof prop.default === 'boolean') return String(prop.default);
  if (Array.isArray(prop.default)) return '[]';
  return String(prop.default);
}

const TOP_LEVEL_FIELDS = Object.entries(schema.properties).filter(([key]) => key !== '$schema');

const portsItemProps = schema.properties.ports.items as {
  properties: Record<string, Record<string, unknown>>;
  required?: string[];
};

export default function Component() {
  return (
    <article className="prose max-w-none">
      <h1>Application configuration</h1>
      <p>
        <code>deploy.yaml</code> is the primary, durable description of an application. It is a
        versioned graph of the components, routes, resources, jobs, and configuration the
        application needs. Keep it in the application repository so the definition can be reviewed,
        reproduced, and moved between deploy.local installations.
      </p>
      <p>
        A configuration file is still optional for the simplest projects. Without one, deploy.local
        detects the project and creates the same one-component application graph automatically.
        Existing <code>deploy.json</code> projects remain supported through the legacy compatibility
        compiler.
      </p>
      <div className="not-prose my-7 rounded-xl border border-warning/30 bg-warning/8 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge badge-success">v1 format available</span>
          <span className="badge badge-success">Graph executor available</span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          Home, selected Suitcases, and connected execution agents materialize build- or
          image-backed components, fixed instance groups, private interfaces, routes, declared
          resources, jobs, configuration, and supported lifecycle profiles. Each v1 graph stays on
          one node; a connected agent returns one primary route to Home rather than distributing
          components across the fleet.
        </p>
      </div>

      <h2>A simple deploy.yaml</h2>
      <p>
        Every v1 manifest starts with an API version and kind. This example makes the implicit
        single-container deployment explicit:
      </p>
      <pre>
        <code>
          {`apiVersion: deploy.local/v1
kind: Application

components:
  web:
    build:
      context: .
    role: web
    interfaces:
      http:
        port: 3000
        protocol: http

routes:
  public:
    to: web.http`}
        </code>
      </pre>
      <p>
        <code>web</code> is a component and <code>http</code> is an interface it provides. The route
        target <code>web.http</code> creates an edge from the public route to that interface. Names
        are stable references within the application; they also give the dashboard useful labels
        when it visualizes the graph.
      </p>

      <h2>How the graph is expressed</h2>
      <p>
        The YAML uses named maps and references instead of a low-level <code>nodes</code> and{' '}
        <code>edges</code> array. References describe both the connection and what deploy.local must
        do with it:
      </p>
      <ul>
        <li>
          A route&apos;s <code>to</code> value sends traffic to a component interface.
        </li>
        <li>
          An environment <code>from</code> value binds declared configuration or another
          component&apos;s interface.
        </li>
        <li>A mount attaches a named volume resource at a container path.</li>
        <li>A job reuses a component image for a one-time command, such as a migration.</li>
      </ul>
      <p>
        A web tier and PostgreSQL remain ordinary components in the same graph. This example runs
        two web instances behind one stable component interface and gives the database a separate
        durable resource:
      </p>
      <pre>
        <code>
          {`components:
  web:
    build:
      context: .
    role: web
    instances: 2
    interfaces:
      http:
        port: 3000
        protocol: http
    environment:
      DATABASE_URL:
        from: db.postgres

  db:
    image: postgres:18
    role: service
    profile: deploy.local/postgres@1
    interfaces:
      postgres:
        port: 5432
        protocol: postgres
    mounts:
      /var/lib/postgresql/data:
        resource: database

resources:
  database:
    type: volume
    durability: durable
    dataRole: database
    access: singleWriter
    reconciliation:
      excludeTables: [sessions]
      excludePaths: [tmp/previews]
      conflictPolicy: collect

routes:
  public:
    to: web.http`}
        </code>
      </pre>
      <p>
        The <code>deploy.local/postgres@1</code> lifecycle profile adds supported backup, restore,
        migration, and version-admission operations to a normal component; it does not turn the
        database into a hidden platform resource. The volume remains separate so its durability and
        access rules are explicit.
      </p>
      <p>
        The optional <code>reconciliation</code> block records application intent without requiring
        a deploy.local data library. Table and relative-path exclusions remove derived or local-only
        content from the shared profile, while <code>conflictPolicy</code> selects collect,
        prefer-home, or prefer-suitcase behavior. These annotations never override integrity,
        primary-key, schema, or opaque-format safety checks; unsafe data still fails closed.
      </p>
      <p>
        <code>instances: 2</code> asks deploy.local to keep two healthy instances behind the
        component&apos;s stable interface. Changing the count creates an immutable desired revision;
        traffic only moves after the new runtime passes health admission.
      </p>

      <h3>Routes, caching, and runtime options</h3>
      <p>
        Route behavior belongs on the route, while container-specific behavior belongs on the
        component. For example:
      </p>
      <pre>
        <code>
          {`components:
  web:
    build:
      context: .
    role: web
    interfaces:
      http:
        port: 3000
        protocol: http
    runtime:
      networks:
        - name: restricted-egress
          subnet: 172.30.0.0/24
      runArgs: [--dns, 172.30.0.10]

routes:
  public:
    to: web.http
    cache:
      maxAge: 60
      paths: [/assets/*, /api/public/*]
      maxObjectBytes: 2097152`}
        </code>
      </pre>
      <p>
        Response caching is opt-in and intended for public, read-only content. Requests carrying
        cookies or authorization, private or <code>no-store</code> responses, and streams bypass the
        cache. Runtime arguments are preserved as argument boundaries and are not evaluated by a
        shell; deploy.local still reserves the container lifecycle arguments it owns.
      </p>

      <h2>Declared configuration and secrets</h2>
      <p>
        The manifest declares every administrator-supplied value an application expects. Components
        then project those declarations into their environment by reference:
      </p>
      <pre>
        <code>
          {`configuration:
  adminUsername:
    type: string
    required: true
    description: Initial administrator username

  adminPassword:
    type: secret
    required: true
    description: Initial administrator password

  logLevel:
    type: string
    default: info
    allowedValues: [debug, info, warn, error]

components:
  web:
    build:
      context: .
    role: web
    interfaces:
      http:
        port: 3000
        protocol: http
    environment:
      ADMIN_USERNAME:
        from: configuration.adminUsername
      ADMIN_PASSWORD:
        from: configuration.adminPassword
      LOG_LEVEL:
        from: configuration.logLevel`}
        </code>
      </pre>
      <p>
        The declaration belongs in <code>deploy.yaml</code>; its server-side value does not. The
        dashboard can generate the correct setup control from <code>type</code>,{' '}
        <code>description</code>, <code>default</code>, and <code>allowedValues</code>. Secret
        values are stored separately and are never written into the manifest or its exports.
      </p>
      <p>
        A required value with no default gates startup for components or jobs that reference it.
        This lets deploy.local build and inspect an application while clearly reporting why it is
        not ready to run. Changing a declaration creates an application revision; changing a value
        creates a configuration revision without putting that value into source control.
      </p>
      <p>
        Declarations have <code>application</code> scope by default. Use <code>scope: site</code>{' '}
        only when each deployment site must provide a different value. Supported declaration types
        are <code>string</code>, <code>boolean</code>, <code>number</code>, and <code>secret</code>.
        Secrets cannot define defaults or allowed values.
      </p>

      <h2>Revisions and the dashboard</h2>
      <p>
        deploy.local normalizes the YAML into a versioned application specification. Formatting,
        comments, and key order do not change the application identity. Runtime state—such as the
        currently running containers, resolved secret values, and per-site placement—is stored
        separately from this durable definition.
      </p>
      <p>
        The application Overview page shows desired and active immutable digests, graph
        components/resources/routes/jobs, and redacted configuration readiness. It can export the
        desired revision as <code>deploy.yaml</code>, so UI-authored changes can return to the
        repository as the durable copy. The component API and CLI can inspect, scale, restart, and
        replace instances without hiding the resulting revision or runtime operation.
      </p>

      <h2>Legacy deploy.json compatibility</h2>
      <p>
        The unversioned <code>deploy.json</code> format remains supported for existing
        single-container projects. deploy.local compiles it into a v1 graph with one main component,
        its public route, and the legacy data and uploads volumes. You can continue using it until
        you are ready to export and commit the equivalent <code>deploy.yaml</code>.
      </p>
      <p>
        Do not keep both files in the same project. If <code>deploy.yaml</code> and{' '}
        <code>deploy.json</code> are both present, deployment stops and asks you to choose one
        instead of silently guessing which definition wins.
      </p>

      <h3>Legacy JSON Schema</h3>
      <p>
        The CLI can copy the legacy JSON schema into a project for editor autocompletion and
        validation:
      </p>
      <pre>
        <code>deploy schema --legacy</code>
      </pre>
      <p>
        Then add a <code>$schema</code> field to <code>deploy.json</code>:
      </p>
      <pre>
        <code>
          {`{
  "$schema": "./deploy.schema.json",
  "port": 3000
}`}
        </code>
      </pre>

      <h3>Legacy fields</h3>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {TOP_LEVEL_FIELDS.map(([key, prop]) => (
            <tr key={key}>
              <td>
                <code>{key}</code>
              </td>
              <td>{formatType(prop as Record<string, unknown>)}</td>
              <td>{formatDefault(prop as Record<string, unknown>)}</td>
              <td>{(prop as Record<string, unknown>).description as string}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p>
        Each entry in <code>ports</code> is an object with:
      </p>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Required</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(portsItemProps.properties).map(([key, prop]) => (
            <tr key={key}>
              <td>
                <code>{key}</code>
              </td>
              <td>{formatType(prop)}</td>
              <td>{portsItemProps.required?.includes(key) ? 'Yes' : 'No'}</td>
              <td>
                {prop.description as string}
                {prop.enum ? (
                  <>
                    {' '}
                    (
                    {(prop.enum as string[]).map((value, index) => (
                      <span key={value}>
                        {index > 0 && ' or '}
                        <code>&quot;{value}&quot;</code>
                      </span>
                    ))}
                    )
                  </>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Legacy examples</h3>
      <p>Set a custom application port and additional TCP port:</p>
      <pre>
        <code>
          {`{
  "port": 8080,
  "ports": [
    { "container": 2222 }
  ]
}`}
        </code>
      </pre>
      <p>
        In Git repositories, <code>.gitignore</code> is respected automatically. The legacy{' '}
        <code>ignore</code> field excludes additional paths:
      </p>
      <pre>
        <code>
          {`{
  "ignore": ["test", "docs", ".vscode"]
}`}
        </code>
      </pre>
      <p>
        For non-Git projects, <code>node_modules</code> and <code>.git</code> are always excluded.
        Use{' '}
        <Link to="/docs/cli">
          <code>deploy files</code>
        </Link>{' '}
        to inspect the bundle before uploading it.
      </p>

      <h2>Validation</h2>
      <p>
        deploy.local validates the selected manifest before materializing it. YAML uses a
        restricted, predictable YAML 1.2 subset: duplicate keys, aliases, anchors, custom tags,
        unknown fields, and invalid graph references are rejected. Legacy JSON rejects unknown
        fields and malformed values through its existing schema. Validation errors include the path
        to the declaration or reference that needs attention.
      </p>
    </article>
  );
}
