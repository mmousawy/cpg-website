import { defineConfig, devices } from '@playwright/test';

// Extract base URL and bypass token from BASE_URL env var
const baseUrlWithToken = process.env.BASE_URL || 'http://localhost:3000';
const [baseUrl, queryString] = baseUrlWithToken.split('?');
const bypassToken = queryString?.includes('x-vercel-protection-bypass')
  ? new URLSearchParams(queryString).get('x-vercel-protection-bypass')
  : process.env.VERCEL_BYPASS_TOKEN;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'html' : 'list',

  // Global teardown to clean up test data
  globalTeardown: './e2e/global-teardown.ts',

  use: {
    baseURL: baseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Add bypass token to all requests if available
    extraHTTPHeaders: bypassToken
      ? {
        'x-vercel-protection-bypass': bypassToken,
      }
      : {},
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Auto-start server for tests (only if not using external URL)
  webServer: process.env.BASE_URL ? undefined : {
    command: process.env.CI ? 'npm start' : 'npm run dev:light',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI, // Reuse existing server locally
    timeout: 120000,
  },
});
