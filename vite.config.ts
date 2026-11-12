import { defineConfig } from 'vitest/config';
import { contentVersion } from './scripts/content-version.mjs';

export default defineConfig({
  // P09-02c: the content version the device sends in X-Fateweave-Content (the server refuses any other).
  define: { __CONTENT_VERSION__: JSON.stringify(contentVersion()) },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
  build: { rollupOptions: { output: { manualChunks: (id: string) => id.includes('node_modules/phaser') ? 'phaser' : undefined } } },
});
