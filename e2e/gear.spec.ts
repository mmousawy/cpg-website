import { expect, test } from './fixtures/member-user';

import { loginTestUser } from './test-utils';

test.describe('Gear', () => {
  test('account gear opens the add dialog and the public gear page loads', async ({ page, memberUser }) => {
    await loginTestUser(page, memberUser.email, memberUser.password);

    await page.goto('/account/gear');
    await expect(page.getByRole('heading', { name: 'My gear', exact: true })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole('button', { name: 'Add gear', exact: true }).first().click();
    const dialog = page.locator('dialog[open]');
    await expect(dialog.getByRole('heading', { name: 'Add gear', exact: true })).toBeVisible();
    await expect(dialog.getByPlaceholder('Search or type gear name')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();

    await page.goto(`/@${memberUser.nickname}/gear`);
    await expect(page.getByRole('heading', { name: /gear list/i })).toBeVisible();
  });
});
