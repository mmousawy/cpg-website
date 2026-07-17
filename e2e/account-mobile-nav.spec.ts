import { expect, test } from '@playwright/test';

import { cleanupTestUsers, createTestUser, loginTestUser, type TestUser } from './test-utils';

test.describe('Account mobile section nav', () => {
  let testUser: TestUser;

  test.beforeAll(async ({ request }) => {
    testUser = await createTestUser(request);
  });

  test.afterAll(async ({ request }) => {
    if (!testUser) return;

    try {
      await cleanupTestUsers(request, [testUser.email]);
    } catch (error) {
      console.error('Failed to cleanup test user:', error);
    }
  });

  test('scrolls to the selected section on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginTestUser(page, testUser.email, testUser.password);

    await page.goto('/account');
    await expect(page.getByRole('heading', { name: 'Account settings' })).toBeVisible();
    // Wait for the account form content to finish loading (isLoading = false)
    // so all section elements are in the DOM before we interact with the nav.
    await page.locator('#copyright').waitFor({ state: 'attached', timeout: 15000 });

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
