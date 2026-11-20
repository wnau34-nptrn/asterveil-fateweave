import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import { contentVersion } from './scripts/content-version.mjs';

// The build id: the commit CI builds, else the content version. `version.json` next to index.html lets a page that is
// already open notice a newer publish (src/platform/update-check.ts); it is never cached by the page itself.
const build = (process.env.GITHUB_SHA ?? '').slice(0, 12) || contentVersion();
const versionFile: Plugin = { name: 'fateweave-version-file', generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build, content: contentVersion() }) }); } };

export default defineConfig({
  plugins: [versionFile],
  // P09-02c: the content version the device sends in X-Fateweave-Content (the server refuses any other).
  define: { __CONTENT_VERSION__: JSON.stringify(contentVersion()), __BUILD_ID__: JSON.stringify(build) },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
  build: { rollupOptions: { output: { manualChunks: (id: string) => id.includes('node_modules/phaser') ? 'phaser' : undefined } } },
});
