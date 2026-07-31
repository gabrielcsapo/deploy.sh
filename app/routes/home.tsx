import { Link } from 'react-flight-router/client';
import { AnimatedTerminal, DashboardPreview } from './home.client';
import { AuthAwareCTA } from '../components/AuthAwareCTA.client';
import { CopyCommand } from '../components/CopyCommand.client';

declare const __APP_VERSION__: string;

export default function Component() {
  return (
    <main className="relative overflow-hidden">
      {/* Hero — two-column on desktop, copy-left + terminal-right.
          Single column with terminal below copy on mobile. */}
      <section className="relative mesh-bg">
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" aria-hidden />
        <div className="relative max-w-6xl mx-auto px-6 pt-16 sm:pt-24 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-center">
            {/* Left: copy */}
            <div>
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="pill-live">
                  <span className="font-mono uppercase tracking-wider text-[10px]">
                    self-hosted · v{__APP_VERSION__}
                  </span>
                </span>
                <a
                  href="https://github.com/gabrielcsapo/deploy.local"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-white/10 bg-bg-surface/60 backdrop-blur-sm text-text-secondary hover:text-text hover:ring-white/20 transition-colors"
                >
                  <IconGithub />
                  Star on GitHub
                </a>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-[3.5rem] font-semibold tracking-tight leading-[1.05] mb-5">
                Ship to your <span className="gradient-text">own metal.</span>
              </h1>

              <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-[52ch] mb-8">
                No cloud, no per-seat pricing, no vendor lock-in. Push once, then run each app on
                the Linux box or Mac that has the right storage, GPU, or horsepower. One dashboard
                and one <code className="font-mono text-text">*.local</code> URL either way.
              </p>

              <div className="flex flex-wrap gap-3 mb-8">
                <AuthAwareCTA />
                <Link to="/docs" className="btn">
                  Read the docs
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-mono text-text-tertiary">
                <span>Linux + macOS nodes</span>
                <span className="opacity-40">·</span>
                <span>Docker 24+</span>
                <span className="opacity-40">·</span>
                <span>mDNS + self-signed CA</span>
              </div>
            </div>

            {/* Right: terminal */}
            <div className="lg:pl-2">
              <AnimatedTerminal />
            </div>
          </div>
        </div>
      </section>

      {/* Install — first thing after the hero, because it's the first thing
          anyone actually needs from this page. */}
      <section className="relative max-w-4xl mx-auto px-6 pt-4 pb-4 sm:pt-6">
        <div className="card-hero p-6 sm:p-8">
          <p className="eyebrow mb-2">Install</p>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-2">
            One coordinator for the whole house.
          </h2>
          <p className="text-sm text-text-secondary max-w-[60ch] mb-5">
            Downloads the CLI for your platform and points{' '}
            <code className="font-mono text-text">~/.deployrc</code> at this server. Run it on the
            machine that will own your dashboard and{' '}
            <code className="font-mono text-text">*.local</code> names. Add execution nodes from the
            web UI whenever you need them.
          </p>
          <CopyCommand command="curl -fsSL deploy.local/install | sh" />
          <ol className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <InstallStep n={1} command="deploy register" hint="Create your account" />
            <InstallStep n={2} command="deploy" hint="Ship the current directory" />
            <InstallStep n={3} command="deploy upgrade" hint="Update the CLI later" />
          </ol>
        </div>
      </section>

      <FleetShowcase />

      {/* Feature grid */}
      <section className="relative max-w-6xl mx-auto px-6 py-20 sm:py-24">
        <div className="mb-12">
          <p className="eyebrow mb-2">Why deploy.local</p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight max-w-[28ch]">
            A PaaS, on hardware you already own.
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <FeatureCard
            icon={<IconBolt />}
            title="Push and serve"
            body="Run `deploy` from any project directory. The CLI auto-detects Node, Docker, or static sites and gives you a *.local URL in seconds."
          />
          <FeatureCard
            icon={<IconNodes />}
            title="Place apps where they belong"
            body="Set a default node once, pin storage-heavy apps to another machine, and move managed data with visible progress when placement changes."
          />
          <FeatureCard
            icon={<IconShield />}
            title="Yours, end to end"
            body="SQLite on disk, self-signed CA, mDNS resolution. No cloud roundtrip, no external dependencies, no per-seat bill ever."
          />
          <FeatureCard
            icon={<IconActivity />}
            title="Observability that's actually real"
            body="Per-app RPS, p95, CPU, memory, and error rate on one screen. Logs, metrics, build history, and a deploy timeline included."
          />
        </div>
      </section>

      {/* Dashboard preview strip */}
      <section className="relative max-w-6xl mx-auto px-6 pb-24 sm:pb-32">
        <DashboardPreview />
      </section>

      {/* Bottom CTA */}
      <section className="relative max-w-4xl mx-auto px-6 pb-24 sm:pb-32">
        <div className="card-hero p-8 sm:p-12 text-center">
          <p className="eyebrow mb-3">Ready to ship?</p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4">
            One command. Your server. Done.
          </h2>
          <p className="text-text-secondary max-w-[52ch] mx-auto mb-7">
            Install the CLI, point it at any project, and watch it appear on your dashboard. Free,
            MIT-licensed, self-contained.
          </p>
          <CopyCommand
            command="curl -fsSL deploy.local/install | sh"
            className="max-w-md mx-auto mb-3"
          />
          <p className="text-[11px] text-text-tertiary mb-7">
            Install the coordinator first. Enroll Linux or macOS execution nodes from the dashboard.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <AuthAwareCTA />
            <a
              href="https://github.com/gabrielcsapo/deploy.local"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
            >
              <IconGithub />
              Star on GitHub
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function FleetShowcase() {
  return (
    <section className="relative max-w-6xl mx-auto px-6 py-20 sm:py-24">
      <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-14 items-center">
        <div>
          <p className="eyebrow mb-3">Multi-node fleets</p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight mb-4">
            The URL stays put. The workload goes where it belongs.
          </h2>
          <p className="text-sm sm:text-base text-text-secondary leading-relaxed mb-6 max-w-[52ch]">
            The coordinator advertises every <code className="font-mono text-text">*.local</code>{' '}
            hostname and routes traffic across your LAN. Agents build and run containers locally,
            while terminal sessions, logs, backups, and migration progress flow back to one UI.
          </p>
          <Link to="/docs/nodes" className="btn">
            Explore multi-node setup <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="card-hero p-4 sm:p-6" aria-label="Multi-node deployment topology">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_44px_1.15fr_44px_1fr] gap-3 sm:gap-0 items-center">
            <TopologyEndpoint label="Your network" title="medius.local" detail="Browser · CLI" />
            <TopologyArrow />
            <div className="rounded-xl border border-accent/35 bg-accent/10 px-4 py-5 text-center shadow-[0_0_30px_hsl(266_90%_60%_/_0.12)]">
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-accent text-white mb-3">
                <IconDiamond />
              </span>
              <p className="text-sm font-semibold">Main host</p>
              <p className="text-[10px] font-mono uppercase tracking-wider text-accent mt-1">
                Coordinator
              </p>
              <p className="text-[11px] text-text-tertiary mt-2">mDNS · TLS · routing · backups</p>
            </div>
            <TopologyArrow />
            <div className="space-y-2">
              <TopologyNode name="imac" detail="media · attached storage" active />
              <TopologyNode name="server" detail="default workloads" />
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-text-tertiary">
            <p>
              <span className="text-success">●</span> Agents connect outbound
            </p>
            <p>
              <span className="text-accent">↔</span> Managed volumes move safely
            </p>
            <p>
              <span className="text-warning">◆</span> One hostname survives moves
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function TopologyEndpoint({
  label,
  title,
  detail,
}: {
  label: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-bg/50 px-3 py-4 text-center">
      <p className="eyebrow mb-1">{label}</p>
      <p className="font-mono text-sm text-text">{title}</p>
      <p className="text-[10px] text-text-tertiary mt-1">{detail}</p>
    </div>
  );
}

function TopologyArrow() {
  return (
    <div className="hidden sm:flex items-center text-text-tertiary" aria-hidden>
      <span className="h-px flex-1 bg-gradient-to-r from-border to-accent/50" />
      <span className="text-accent text-xs">›</span>
    </div>
  );
}

function TopologyNode({
  name,
  detail,
  active = false,
}: {
  name: string;
  detail: string;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-3 ${active ? 'border-success/30 bg-success/5' : 'border-white/[0.06] bg-bg/50'}`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`size-2 rounded-full ${active ? 'bg-success shadow-[0_0_10px_var(--color-success)]' : 'bg-text-tertiary/50'}`}
        />
        <p className="font-mono text-xs text-text">{name}</p>
      </div>
      <p className="text-[10px] text-text-tertiary mt-1.5 pl-4">{detail}</p>
    </div>
  );
}

function InstallStep({ n, command, hint }: { n: number; command: string; hint: string }) {
  return (
    <li className="flex items-start gap-2.5 rounded-lg border border-white/5 bg-bg/40 px-3 py-2.5">
      <span
        className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-white/[0.06] font-mono text-[10px] text-text-tertiary"
        aria-hidden
      >
        {n}
      </span>
      <div className="min-w-0">
        <code className="block truncate font-mono text-[13px] text-text">{command}</code>
        <p className="text-[11px] text-text-tertiary mt-0.5">{hint}</p>
      </div>
    </li>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="group relative card p-5 sm:p-6 transition-colors hover:border-border-hover">
      <div className="mb-4 inline-flex items-center justify-center w-10 h-10 rounded-lg border border-white/[0.06] bg-bg/60 text-accent">
        {icon}
      </div>
      <h3 className="text-base font-semibold tracking-tight mb-1.5">{title}</h3>
      <p className="text-sm text-text-secondary leading-relaxed">{body}</p>
      <div
        className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 80% at 0% 0%, hsl(266 90% 66% / 0.1), transparent 60%)',
        }}
      />
    </div>
  );
}

function IconBolt() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
      <path d="M13 3 4 14h7l-1 7 9-11h-7l1-7Z" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
      <path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3Z" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function IconActivity() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
      <path d="M3 12h4l3-8 4 16 3-8h4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function IconNodes() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
      <rect x="3" y="4" width="7" height="6" rx="1.5" />
      <rect x="14" y="14" width="7" height="6" rx="1.5" />
      <path d="M10 7h3a4 4 0 0 1 4 4v3M7 10v4a3 3 0 0 0 3 3h4" strokeLinecap="round" />
    </svg>
  );
}

function IconDiamond() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
      <path d="m12 3 9 9-9 9-9-9 9-9Z" />
      <path d="m12 7 5 5-5 5-5-5 5-5Z" opacity=".65" />
    </svg>
  );
}

function IconGithub() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="size-4">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
