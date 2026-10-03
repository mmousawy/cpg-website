import { defineConfig, devices } from '@playwright/test';

import { getPlaywrightApiContextOptions, isStagingE2ETarget } from './e2e/test-utils';

const { baseURL, extraHTTPHeaders } = getPlaywrightApiContextOptions();

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: process.env.CI ? 90_000 : 30_000,
  globalTimeout: process.env.CI ? 40 * 60_000 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',

  // Global teardown to clean up test data
  globalTeardown: './e2e/global-teardown.ts',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    extraHTTPHeaders,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Auto-start a local server unless tests already target a remote URL.
  webServer: isStagingE2ETarget() || process.env.BASE_URL ? undefined : {
    command: process.env.CI ? 'npm start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI, // Reuse existing server locally
    timeout: 120000,
  },
});
