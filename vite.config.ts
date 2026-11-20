import { defineConfig } from 'vitest/config';
import type { Plugin, ResolvedConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { contentVersion } from './scripts/content-version.mjs';

// The build id: the commit CI builds, else the content version. `version.json` next to index.html lets a page that is
// already open notice a newer publish (src/platform/update-check.ts); it is never cached by the page itself.
const build = (process.env.GITHUB_SHA ?? '').slice(0, 12) || contentVersion();
const versionFile: Plugin = { name: 'fateweave-version-file', generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build, content: contentVersion() }) }); } };

// Perf audit R8: `sw.js` = src/platform/service-worker.js with the build id and every `assets/` file's SHA-256 prefix
// (music excluded: streamed with range requests). Written after the bundle and the public folder are on disk.
let outDir = 'dist';
const serviceWorker: Plugin = {
  name: 'fateweave-service-worker', apply: 'build',
  configResolved(c: ResolvedConfig) { outDir = resolve(c.root, c.build.outDir); },
  closeBundle() {
    const manifest: Record<string, string> = {};
    const walk = (dir: string): void => { for (const name of readdirSync(dir)) { const path = join(dir, name);
      if (statSync(path).isDirectory()) { if (name !== 'music') walk(path); continue; }
      manifest[relative(outDir, path).split('\\').join('/')] = createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 12); } };
    walk(join(outDir, 'assets'));
    const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
    writeFileSync(join(outDir, 'sw.js'), `const BUILD = ${JSON.stringify(build)};\nconst MANIFEST = ${JSON.stringify(sorted)};\n${readFileSync(resolve('src/platform/service-worker.js'), 'utf8')}`);
  },
};

export default defineConfig({
  plugins: [versionFile, serviceWorker],
  // P09-02c: the content version the device sends in X-Fateweave-Content (the server refuses any other).
  define: { __CONTENT_VERSION__: JSON.stringify(contentVersion()), __BUILD_ID__: JSON.stringify(build) },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
  build: { rollupOptions: { output: { manualChunks: (id: string) => id.includes('node_modules/phaser') ? 'phaser' : undefined } } },
});
