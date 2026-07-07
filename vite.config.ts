/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { mockOAuthPlugin } from './src/services/auth/mock-oauth-plugin';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string;
};

export default defineConfig({
  plugins: [preact(), tailwindcss(), mockOAuthPlugin()],
  define: {
    __CAPTAINSLOG_VERSION__: JSON.stringify(pkg.version),
  },
  // Relative base so the static build deploys from any path (S3, GH Pages, file://).
  base: './',
  optimizeDeps: {
    // coolhand is a symlinked file: dependency shipping a UMD/CJS bundle;
    // without this Vite treats it as source and skips CJS interop.
    include: ['coolhand'],
  },
  build: {
    commonjsOptions: {
      // The symlinked coolhand dep resolves OUTSIDE node_modules, so the
      // default include pattern would skip its UMD→ESM interop.
      include: [/node_modules/, /coolhand-js/],
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: false,
  },
});
