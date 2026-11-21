import { defineConfig } from '@playwright/test';
// Perf audit 2026-11-20: measurement only. PERF_URL = base URL (default: local `vite preview` of the Pages build).
const external = process.env.PERF_URL;
const baseURL = external ?? 'http://127.0.0.1:4173/asterveil-fateweave/';
export default defineConfig({
  testDir: '.', testMatch: /.*\.perf\.ts/, fullyParallel: false, workers: 1, timeout: 1800000,
  reporter: 'line',
  use: { baseURL, launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--enable-precise-memory-info', '--js-flags=--expose-gc'] } },
  ...(external ? {} : { webServer: { command: 'npm run preview -- --port 4173 --base=/asterveil-fateweave/', url: baseURL, reuseExistingServer: true, cwd: '../../../..' } }),
});
