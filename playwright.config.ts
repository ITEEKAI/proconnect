import path from 'node:path';
import { defineConfig } from '@playwright/test';

const root = process.cwd();
const uploads = (edition: string) => path.join(root, 'test-results', 'uploads', edition);

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['line'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  outputDir: 'test-results/playwright',
  use: {
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1440, height: 1000 },
  },
  webServer: [
    {
      command: 'node --experimental-sqlite --experimental-strip-types server/src/index.ts',
      url: 'http://127.0.0.1:4200/api/health',
      name: 'OffGrid056 API',
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        BUSINESS_EDITION: 'offgrid056', DATABASE_PATH: ':memory:', UPLOADS_DIR: uploads('offgrid056'),
        PORT: '4200', PUBLIC_URL: 'http://127.0.0.1:5273',
      },
    },
    {
      command: 'npm run dev -w web -- --strictPort',
      url: 'http://127.0.0.1:5273',
      name: 'OffGrid056 web',
      timeout: 120_000,
      reuseExistingServer: false,
      env: { WEB_PORT: '5273', API_PROXY_TARGET: 'http://127.0.0.1:4200' },
    },
    {
      command: 'node --experimental-sqlite --experimental-strip-types server/src/index.ts',
      url: 'http://127.0.0.1:4300/api/health',
      name: 'HPLBIZ API',
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        BUSINESS_EDITION: 'hplbiz', DATABASE_PATH: ':memory:', UPLOADS_DIR: uploads('hplbiz'),
        PORT: '4300', PUBLIC_URL: 'http://127.0.0.1:5274',
      },
    },
    {
      command: 'npm run dev -w web -- --strictPort',
      url: 'http://127.0.0.1:5274',
      name: 'HPLBIZ web',
      timeout: 120_000,
      reuseExistingServer: false,
      env: { WEB_PORT: '5274', API_PROXY_TARGET: 'http://127.0.0.1:4300' },
    },
  ],
});
