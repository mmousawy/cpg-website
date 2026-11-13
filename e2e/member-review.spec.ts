import { expect, test } from '@playwright/test';

test.describe('Member review preview', () => {
  test('under-review preview renders without signing in', async ({ page }) => {
    await page.goto('/under-review?preview-review=true');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Account under review' })).toBeVisible();
  });

  test('network-blocked preview renders without signing in', async ({ page }) => {
    await page.goto('/network-blocked?preview-block=true');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'You have been blocked' })).toBeVisible();
  });
});
