import { Link } from 'react-flight-router/client';
import { AuthAwareCTA } from '../components/AuthAwareCTA.client';
import { CopyCommand } from '../components/CopyCommand.client';
import { PublicCloudGraph } from './home.client';

declare const __APP_VERSION__: string;

export default function Component() {
  return (
    <main className="public-home">
      <section className="public-home-hero">
        <div className="public-home-grid" aria-hidden="true" />
        <div className="public-home-frame">
          <div className="public-home-intro">
            <div>
              <p className="public-home-kicker">
                <span /> Home authority · live
              </p>
              <h1>
                Your apps. Your machines. <em>One connected cloud.</em>
              </h1>
            </div>
            <aside>
              <span>deploy.local · v{__APP_VERSION__}</span>
              <p>
                Deploy from one command center, see requests move through the whole system, and take
                selected apps offline while Home keeps serving.
              </p>
              <div className="public-home-actions">
                <AuthAwareCTA />
                <Link to="/docs" className="btn">
                  Explore the model
                </Link>
              </div>
            </aside>
          </div>

          <PublicCloudGraph />

          <div className="public-home-principles" aria-label="The deploy.local model">
            <HomePrinciple
              label="See"
              title="Requests stay attached to the graph"
              body="Traffic, capacity, runtime health, and durable data share one operating context."
            />
            <HomePrinciple
              label="Place"
              title="Machines contribute; Home coordinates"
              body="Add compute without turning every machine into a separate island to manage."
            />
            <HomePrinciple
              label="Carry"
              title="A Suitcase is a detachable site"
              body="Keep chosen applications ready, work offline, then exchange attributable changes."
            />
          </div>
        </div>
      </section>

      <section className="public-home-system">
        <div className="public-section-heading">
          <p className="eyebrow">The operating model</p>
          <h2>A cloud is not a machine. It is the graph between them.</h2>
          <p>
            deploy.local gives every part of the system a visible role. The graph tells you what an
            application needs, where it is materialized, and which place owns each durable change.
          </p>
        </div>
        <div className="public-system-ledger">
          <SystemLedgerRow
            marker="A"
            name="Authority"
            description="Home owns identity, revision history, and the primary address."
            example="home gateway"
          />
          <SystemLedgerRow
            marker="G"
            name="Application graph"
            description="Routes, components, jobs, resources, and required configuration move together."
            example="family-hub"
          />
          <SystemLedgerRow
            marker="P"
            name="Place"
            description="A machine contributes runtime capacity; a site defines an operating boundary."
            example="home · carry-on"
          />
          <SystemLedgerRow
            marker="D"
            name="Data authority"
            description="Each durable resource declares how changes may travel and reconcile."
            example="automatic · manual · none"
          />
        </div>
      </section>

      <section className="public-home-contract">
        <div className="public-contract-copy">
          <p className="eyebrow">Repository ↔ command center</p>
          <h2>The interface and the file describe the same application.</h2>
          <p>
            Keep a durable <code>deploy.yaml</code> beside your source. The command center can edit
            the graph and export it again, while required server-side values remain named but never
            written back as secrets.
          </p>
          <Link to="/docs/configuration" className="public-text-link">
            Explore the application graph <span aria-hidden="true">→</span>
          </Link>
        </div>
        <ManifestToGraph />
      </section>

      <section className="public-home-journey">
        <div className="public-section-heading compact">
          <p className="eyebrow">One application · three operating moments</p>
          <h2>Leaving and returning are part of the system.</h2>
          <p>
            Portability is an explicit lifecycle. Every step reports what is ready, what changed,
            and what requires an administrator decision.
          </p>
        </div>
        <ol className="public-journey-line">
          <JourneyMoment
            number="01"
            status="Ready offline"
            title="Prepare while docked"
            body="Select the whole application boundary. Artifacts, configuration contracts, and admitted data reach a verified checkpoint."
            tone="ready"
          />
          <JourneyMoment
            number="02"
            status="Serving away"
            title="Operate without Home"
            body="The Suitcase starts automatically, hosts its local network, and remains buildable and administrable for its operators."
            tone="away"
          />
          <JourneyMoment
            number="03"
            status="Changes attributable"
            title="Rejoin deliberately"
            body="Signed events and content exchange first. Safe changes converge; ambiguous ones wait for an explicit decision."
            tone="route"
          />
        </ol>
      </section>

      <section className="public-home-start">
        <div>
          <p className="eyebrow">Start with one Home</p>
          <h2>Install the authority. Add places when you need them.</h2>
          <p>
            The first deployment stays small: one coordinator, one operator account, one command.
            Nodes, Catalog applications, and Suitcases join the same graph later.
          </p>
          <div className="public-home-actions">
            <AuthAwareCTA />
            <a
              href="https://github.com/gabrielcsapo/deploy.local"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
            >
              View source
            </a>
          </div>
        </div>
        <div className="public-install-panel">
          <div className="public-install-panel-head">
            <span>Install deploy.local</span>
            <small>macOS · Linux · Windows with Docker</small>
          </div>
          <CopyCommand command="curl -fsSL deploy.local/install | sh" />
          <div className="public-install-sequence">
            <InstallStep command="deploy register" result="operator created" />
            <InstallStep command="deploy" result="application graph serving" />
            <InstallStep command="deploy suitcase target" result="portable site ready" />
          </div>
        </div>
      </section>
    </main>
  );
}

function HomePrinciple({ label, title, body }: { label: string; title: string; body: string }) {
  return (
    <article>
      <span>{label}</span>
      <h2>{title}</h2>
      <p>{body}</p>
    </article>
  );
}

function SystemLedgerRow({
  marker,
  name,
  description,
  example,
}: {
  marker: string;
  name: string;
  description: string;
  example: string;
}) {
  return (
    <article>
      <span>{marker}</span>
      <h3>{name}</h3>
      <p>{description}</p>
      <code>{example}</code>
    </article>
  );
}

function ManifestToGraph() {
  return (
    <div
      className="public-manifest-graph"
      aria-label="deploy.yaml compiled into an application graph"
    >
      <div className="public-manifest-file">
        <header>
          <span>deploy.yaml</span>
          <small>deploy.local/v1</small>
        </header>
        <pre>
          <code>{`components:
  web:
    build: { context: . }
    instances: 2
  database:
    profile: deploy.local/postgres@1

resources:
  uploads:
    type: volume
    portability: automatic`}</code>
        </pre>
      </div>
      <div className="public-compiled-graph">
        <span className="compile-label">normalized revision</span>
        <GraphNode kind="route" name="family.local" detail="public traffic" />
        <GraphNode kind="component" name="web ×2" detail="health-gated instances" tone="ready" />
        <div className="public-graph-split" aria-hidden="true" />
        <GraphNode kind="service" name="database" detail="lifecycle profile" />
        <GraphNode kind="data" name="uploads" detail="automatic portability" tone="away" />
      </div>
    </div>
  );
}

function GraphNode({
  kind,
  name,
  detail,
  tone = 'route',
}: {
  kind: string;
  name: string;
  detail: string;
  tone?: 'route' | 'ready' | 'away';
}) {
  return (
    <div className={`public-graph-node tone-${tone}`}>
      <span>{kind}</span>
      <strong>{name}</strong>
      <small>{detail}</small>
    </div>
  );
}

function JourneyMoment({
  number,
  status,
  title,
  body,
  tone,
}: {
  number: string;
  status: string;
  title: string;
  body: string;
  tone: 'ready' | 'away' | 'route';
}) {
  return (
    <li className={`tone-${tone}`}>
      <div>
        <span>{number}</span>
        <em>{status}</em>
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
    </li>
  );
}

function InstallStep({ command, result }: { command: string; result: string }) {
  return (
    <div>
      <code>{command}</code>
      <span aria-hidden="true">→</span>
      <small>{result}</small>
    </div>
  );
}
