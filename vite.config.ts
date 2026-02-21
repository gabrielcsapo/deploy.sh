import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import rsc from '@vitejs/plugin-rsc';
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { reactRouter } from './react-router-vite/plugin.js';

export default defineConfig({
  clearScreen: false,
  build: {
    minify: false,
  },
  plugins: [
    // import("vite-plugin-inspect").then(m => m.default()),
    tailwindcss(),
    react(),
    reactRouter(),
    rsc({
      entries: {
        client: './react-router-vite/entry.browser.tsx',
        ssr: './react-router-vite/entry.ssr.tsx',
        rsc: './react-router-vite/entry.rsc.single.tsx',
      },
    }),
  ],
  preview: {
    port: 5173,
    allowedHosts: true,
    // Allow connections from iOS simulator and local network devices
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:80',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:80',
        ws: true,
      },
      // Proxy all .local domain requests to backend server
      '/': {
        target: 'http://localhost:80',
        changeOrigin: true,
        bypass(req) {
          const host = req.headers.host || '';
          const hostname = host.split(':')[0];
          // Only proxy if hostname ends with .local (but not deploy.local or localhost)
          if (
            hostname.endsWith('.local') &&
            hostname !== 'deploy.local' &&
            hostname !== 'discover.local' &&
            hostname !== 'localhost'
          ) {
            return null; // null means proxy the request
          }
          // Otherwise, let Vite handle it
          return req.url;
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './app'),
    },
  },
  optimizeDeps: {
    include: ['react-router', 'react-router/internal/react-server-client'],
    exclude: ['better-sqlite3'],
  },
  server: {
    watch: {
      ignored: ['.deploy-data/**'],
    },
    allowedHosts: true,
    // Allow connections from iOS simulator and local network devices
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:80',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:80',
        ws: true,
      },
      // Proxy all .local domain requests to backend server
      '/': {
        target: 'http://localhost:80',
        changeOrigin: true,
        bypass(req) {
          const host = req.headers.host || '';
          const hostname = host.split(':')[0];
          // Only proxy if hostname ends with .local (but not deploy.local or localhost)
          if (
            hostname.endsWith('.local') &&
            hostname !== 'deploy.local' &&
            hostname !== 'discover.local' &&
            hostname !== 'localhost'
          ) {
            return null; // null means proxy the request
          }
          // Otherwise, let Vite handle it
          return req.url;
        },
      },
    },
  },
  // Public directory for static assets
  publicDir: 'public',
}) as any;
