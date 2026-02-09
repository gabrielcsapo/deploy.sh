'use client';

import { useNavigation, useRouteError } from 'react-router';

export function GlobalNavigationLoadingBar() {
  const navigation = useNavigation();

  if (navigation.state === 'idle') return null;

  return (
    <div className="h-0.5 w-full bg-bg-surface overflow-hidden fixed top-0 left-0 z-50">
      <div className="animate-progress origin-[0%_50%] w-full h-full bg-accent" />
    </div>
  );
}

export function DumpError() {
  const error = useRouteError();
  const message =
    error instanceof Error ? (
      <div>
        <pre className="text-sm bg-bg border border-border rounded-lg p-4 overflow-auto">
          {JSON.stringify(
            {
              ...error,
              name: error.name,
              message: error.message,
            },
            null,
            2,
          )}
        </pre>
        {error.stack && (
          <pre className="text-xs text-text-tertiary mt-4 overflow-auto">{error.stack}</pre>
        )}
      </div>
    ) : (
      <div className="text-sm text-text-secondary">Unknown Error</div>
    );
  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <h1 className="text-lg font-semibold text-danger mb-4">Something went wrong</h1>
      {message}
    </div>
  );
}
