import './styles.css';
import { Link, Outlet } from 'react-router';
import { DumpError, GlobalNavigationLoadingBar } from './routes/root.client';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Self-hosted deployment platform. Deploy and manage your applications from your own server."
        />
        <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <title>deploy.sh</title>
      </head>
      <body>
        <GlobalNavigationLoadingBar />
        <header className="border-b border-border">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to="/" className="text-sm font-semibold tracking-tight text-text">
                deploy.sh
              </Link>
              <nav className="flex items-center gap-6">
                <Link
                  to="/docs"
                  className="text-sm text-text-secondary hover:text-text transition-colors"
                >
                  Docs
                </Link>
                <Link
                  to="/dashboard"
                  className="text-sm text-text-secondary hover:text-text transition-colors"
                >
                  Dashboard
                </Link>
              </nav>
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}

export default function Component() {
  return <Outlet />;
}

export function ErrorBoundary() {
  return <DumpError />;
}
