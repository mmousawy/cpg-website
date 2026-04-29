import { expect, test } from '@playwright/test';

import { createTestUser, loginTestUser, type TestUser } from './test-utils';

test.describe('Account mobile section nav', () => {
  let testUser: TestUser;
  let baseUrl: string;
  let bypassToken: string | undefined;

  test.beforeAll(async ({ }, testInfo) => {
    baseUrl = testInfo.project.use.baseURL || 'http://localhost:3000';
    bypassToken = process.env.VERCEL_BYPASS_TOKEN;
    testUser = await createTestUser(baseUrl, bypassToken);
  });

  test.afterAll(async () => {
    if (!testUser || !baseUrl) return;

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (bypassToken) {
        headers['x-vercel-protection-bypass'] = bypassToken;
      }

      await fetch(`${baseUrl}/api/test/cleanup`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ emails: [testUser.email] }),
      });
    } catch (error) {
      console.error('Failed to cleanup test user:', error);
    }
  });

  test('scrolls to the selected section on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginTestUser(page, testUser.email, testUser.password);

    await page.goto('/account');
    await expect(page.getByRole('heading', { name: 'Account settings' })).toBeVisible();

    const startingScrollY = await page.evaluate(() => window.scrollY);

    await page.getByRole('button', { name: /open sections/i }).click();
    const targetId = 'copyright';
    const targetLink = page
      .getByRole('navigation', { name: 'Account sections' })
      .getByRole('link', { name: 'Copyright & licensing' });

    await targetLink.click();

    await expect(page).toHaveURL(new RegExp(`#${targetId}$`));

    await expect.poll(async () => page.locator(`#${targetId}`).evaluate(
      (element) => Math.round(element.getBoundingClientRect().top),
    )).toBeLessThan(220);

    const endingScrollY = await page.evaluate(() => window.scrollY);
    expect(endingScrollY).toBeGreaterThan(startingScrollY + 100);
  });
});
