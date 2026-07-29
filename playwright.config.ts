import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

/**
 * EVCorn Playwright E2E configuration
 *
 * baseURL strategy:
 * - Local default: http://localhost:4200 (Angular dev server)
 * - CI: same host; webServer starts backend (file DB) + frontend serve
 * - Override: PLAYWRIGHT_BASE_URL=https://evcorn.com (manual prod smoke only)
 *
 * Backend for CI/local E2E uses empty MONGO_URI → local file DB
 * (backend/data/*.json). Do not point PR CI at live Render.
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4200';
const isCI = !!process.env.CI;
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === '1' || !!process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 20_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'artifacts/playwright-report' }],
    ['json', { outputFile: 'artifacts/playwright-results.json' }]
  ],
  outputDir: 'artifacts/playwright-output',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ...devices['Desktop Chrome']
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: skipWebServer
    ? undefined
    : [
        {
          command: 'node server.js',
          cwd: path.join(__dirname, 'backend'),
          url: 'http://127.0.0.1:3000/api/health/live',
          // Always start a dedicated E2E backend so CORS/file-DB env is correct.
          reuseExistingServer: false,
          timeout: 120_000,
          env: {
            ...process.env,
            PORT: '3000',
            NODE_ENV: 'development',
            MONGO_URI: '',
            ALLOWED_ORIGINS:
              'http://localhost:4200,http://127.0.0.1:4200,https://evcorn.com,https://evcorn.vercel.app'
          }
        },
        {
          command: 'npx ng serve --host localhost --port 4200',
          cwd: path.join(__dirname, 'frontend'),
          url: 'http://localhost:4200',
          reuseExistingServer: !isCI,
          timeout: 180_000
        }
      ]
});
