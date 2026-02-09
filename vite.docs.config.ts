import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'path';
import { copyFileSync } from 'fs';

function copy404(): Plugin {
  return {
    name: 'copy-404',
    writeBundle(options) {
      copyFileSync(resolve(__dirname, 'docs-site', '404.html'), resolve(options.dir!, '404.html'));
    },
  };
}

export default defineConfig({
  root: 'docs-site',
  base: '/deploy.sh/',
  build: {
    outDir: resolve(__dirname, 'dist-docs'),
    emptyOutDir: true,
    minify: false,
  },
  plugins: [tailwindcss(), react(), copy404()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './app'),
    },
  },
  publicDir: resolve(__dirname, 'public'),
});
