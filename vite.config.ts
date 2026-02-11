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
  },
  // Public directory for static assets
  publicDir: 'public',
}) as any;
