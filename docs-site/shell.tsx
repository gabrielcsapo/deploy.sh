import { Link, Outlet } from 'react-router';

export default function Shell() {
  return (
    <>
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-sm font-semibold tracking-tight text-text no-underline">
              deploy.sh
            </Link>
            <nav className="flex items-center gap-6">
              <Link
                to="/docs"
                className="text-sm text-text-secondary hover:text-text transition-colors no-underline"
              >
                Docs
              </Link>
              <a
                href="https://github.com/gabrielcsapo/deploy.sh"
                className="text-sm text-text-secondary hover:text-text transition-colors no-underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </nav>
          </div>
        </div>
      </header>
      <Outlet />
    </>
  );
}
