import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('docs', 'routes/docs/layout.tsx', [
    index('routes/docs/index.tsx'),
    route('deploying', 'routes/docs/deploying.tsx'),
    route('configuration', 'routes/docs/configuration.tsx'),
    route('cli', 'routes/docs/cli.tsx'),
    route('architecture', 'routes/docs/architecture.tsx'),
  ]),
  route('dashboard', 'routes/dashboard/layout.tsx', [
    index('routes/dashboard/index.tsx'),
    route('settings', 'routes/dashboard/settings.tsx'),
    route(':name', 'routes/dashboard/detail/layout.tsx', [
      index('routes/dashboard/detail/overview.tsx'),
      route('build', 'routes/dashboard/detail/build.tsx'),
      route('logs', 'routes/dashboard/detail/logs.tsx'),
      route('terminal', 'routes/dashboard/detail/terminal.tsx'),
      route('requests', 'routes/dashboard/detail/requests.tsx'),
      route('resources', 'routes/dashboard/detail/resources.tsx'),
      route('history', 'routes/dashboard/detail/history.tsx'),
      route('backups', 'routes/dashboard/detail/backups.tsx'),
    ]),
  ]),
] satisfies RouteConfig;
