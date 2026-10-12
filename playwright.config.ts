import { defineConfig } from '@playwright/test';

const pages = process.env.PLAYWRIGHT_PAGES === 'true';
const baseURL = pages ? 'http://127.0.0.1:4173/asterveil-fateweave/' : 'http://127.0.0.1:5173/';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL,
    viewport: { width: 1366, height: 1000 },
    reducedMotion: 'reduce',
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
      args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: pages ? 'npm run preview -- --port 4173 --base=/asterveil-fateweave/' : 'npm run dev -- --port 5173',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
