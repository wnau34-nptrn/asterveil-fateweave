import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({ ...base, use: { ...base.use, baseURL: 'http://127.0.0.1:5193/' }, webServer: { command: 'npm run dev -- --port 5193 --strictPort', url: 'http://127.0.0.1:5193/', reuseExistingServer: false } });
