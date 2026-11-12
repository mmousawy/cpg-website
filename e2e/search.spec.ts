import { expect, test } from './fixtures/member-user';

import { E2E_INCLUDE_TEST_HEADER, getInternalApiSecret } from './test-utils';

test.describe('Global search', () => {
  test('opens from the header and finds a member', async ({ page, memberUser }) => {
    // Client-side fetch() inside the search modal does not carry Playwright's
    // extraHTTPHeaders, so the server filters out test-* profiles.
    // Inject the E2E header via route interception.
    const secret = getInternalApiSecret();
    if (secret) {
      await page.route('**/api/search*', async (route) => {
        await route.continue({
          headers: {
            ...route.request().headers(),
            [E2E_INCLUDE_TEST_HEADER]: secret,
          },
        });
      });
    }

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
