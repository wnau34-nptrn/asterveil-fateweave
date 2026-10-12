import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
  build: { rollupOptions: { output: { manualChunks: (id: string) => id.includes('node_modules/phaser') ? 'phaser' : undefined } } },
});
