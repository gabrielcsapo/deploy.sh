'use client';

import { useState } from 'react';
import { Link } from 'react-flight-router/client';
import { BrandMark } from '../../components/BrandLogo';
import { LoadingState, ErrorBanner } from '../../components/LoadingState';
import { FleetTopologyBoard } from '../../components/dashboard/FleetTopologyBoard';
import { useDashboardData } from './data.client';

/**
 * Overview — a graph-first answer to what exists, where it runs, and what
 * needs attention. Metrics and activity remain drill-downs; the primary
 * surface is the fleet's current topology.
 */
export default function OverviewClient() {
  const { deployments, aggregate, cards, loading, error } = useDashboardData();

  if (loading && deployments.length === 0) {
    return (
      <div className="command-center-page">
        <FleetPageHeading loading />
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="command-center-page">
      <FleetPageHeading />

      {error && <ErrorBanner message={error} />}

      {deployments.length === 0 ? (
        <EmptyState />
      ) : (
        <FleetTopologyBoard
          cards={cards}
          deployments={deployments}
          totals={aggregate?.totals ?? null}
        />
      )}
    </div>
  );
}

function FleetPageHeading({ loading = false }: { loading?: boolean }) {
  return (
    <header className="command-center-heading">
      <div className="command-center-title">
        <BrandMark />
        <span>
          <span className="command-kicker">
            <span className="fleet-live-dot" aria-hidden />
            {loading ? 'Locating your cloud' : 'Home authority · live'}
          </span>
          <h1>Command center</h1>
        </span>
      </div>
      <button
        type="button"
        className="command-center-search"
        onClick={() => window.dispatchEvent(new CustomEvent('deploy:command-palette'))}
      >
        <span aria-hidden>⌕</span>
        Navigate or run a command
        <kbd>⌘K</kbd>
      </button>
    </header>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="card overflow-hidden">
      <div className="px-6 py-10 border-b border-border">
        <p className="eyebrow mb-2">Getting started</p>
        <h2 className="text-lg font-semibold mb-2">Deploy your first app</h2>
        <p className="text-sm text-text-secondary max-w-[58ch]">
          Three commands from any project directory. The CLI installs from this server, so
          there&apos;s nothing to configure first.
        </p>
      </div>
      <ol className="divide-y divide-border">
        <Step
          num={1}
          title="Install the CLI"
          snippet="curl -fsSL https://deploy.local/install | sh"
          hint="Pulls the deploy binary directly from your own server."
        />
        <Step
          num={2}
          title="Register an account"
          snippet="deploy register"
          hint="One-time. Creates your operator account and saves a session token."
        />
        <Step
          num={3}
          title="Deploy a project"
          snippet="cd my-project && deploy"
          hint="Auto-detects Node.js, Docker, or static. The app appears here once it's running."
        />
      </ol>
      <div className="px-6 py-4 border-t border-border text-xs text-text-tertiary">
        See the{' '}
        <Link to="/docs" className="text-accent hover:text-accent-hover">
          docs
        </Link>{' '}
        for more, or read the{' '}
        <Link to="/docs/cli" className="text-accent hover:text-accent-hover">
          CLI reference
        </Link>
        .
      </div>
    </div>
  );
}

function Step({
  num,
  title,
  snippet,
  hint,
}: {
  num: number;
  title: string;
  snippet: string;
  hint: string;
}) {
  return (
    <li className="px-6 py-4 grid grid-cols-[auto_1fr] gap-4 items-start">
      <span
        className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-border text-xs font-mono text-text-tertiary tabular-nums shrink-0 mt-0.5"
        aria-hidden
      >
        {num}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium mb-1.5">{title}</p>
        <CopyableSnippet snippet={snippet} />
        <p className="text-xs text-text-tertiary mt-1.5">{hint}</p>
      </div>
    </li>
  );
}

function CopyableSnippet({ snippet }: { snippet: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 bg-bg rounded px-2.5 py-1.5 border border-border max-w-fit">
      <span className="text-text-tertiary font-mono text-xs">$</span>
      <code className="text-xs font-mono text-text-secondary">{snippet}</code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(snippet);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          } catch {
            // ignore
          }
        }}
        className="ml-1 text-[10px] font-mono uppercase tracking-wider text-text-tertiary hover:text-accent transition-colors"
        aria-label={copied ? 'Copied' : 'Copy command'}
      >
        {copied ? 'copied' : 'copy'}
      </button>
    </div>
  );
}
