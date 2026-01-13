import { defineConfig, devices } from '@playwright/test';

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
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // In CI: start production server. Locally: assume dev server is running
  webServer: process.env.CI
    ? {
        command: 'npm start',
        url: 'http://localhost:3000',
        reuseExistingServer: false,
        timeout: 60000,
      }
    : undefined,
});
