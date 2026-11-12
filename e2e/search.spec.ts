import { expect, test } from './fixtures/member-user';

test.describe('Global search', () => {
  test('opens from the header and finds a member', async ({ page, memberUser }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Search', exact: true }).first().click();

    const dialog = page.locator('dialog[open]');
    await expect(dialog.getByText(
      'Search across albums, photos, members, gear, events, scene, and tags',
    )).toBeVisible();

    // global_search builds a tsquery from word characters, so a hyphenated
    // nickname is sent as separate tokens (`test 173…`).
    const query = memberUser.nickname.replace(/-/g, ' ');
    await dialog.getByRole('searchbox').fill(query);

    await expect(dialog.getByRole('heading', { name: 'Members', exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(dialog.locator(`a[href="/@${memberUser.nickname}"]`)).toBeVisible();
  });
});
