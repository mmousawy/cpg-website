import { expect, test } from './fixtures/member-user';

test.describe('Global search', () => {
  test('opens from the header and finds a member', async ({ page, memberUser }) => {
    // global_search builds a tsquery from word characters; hyphenated nicknames
    // are queried as separate tokens (`test 173…`).
    const query = memberUser.nickname.replace(/-/g, ' ');

    const searchRes = await page.request.get(
      `/api/search?q=${encodeURIComponent(query)}&types=members&limit=50`,
    );
    expect(searchRes.ok()).toBeTruthy();
    const body = await searchRes.json();
    expect(
      body.results?.some(
        (r: { entity_type: string; url?: string }) =>
          r.entity_type === 'members' && r.url === `/@${memberUser.nickname}`,
      ),
    ).toBeTruthy();

    await page.goto('/');
    await page.getByRole('button', { name: 'Search', exact: true }).first().click();

    const dialog = page.locator('dialog[open]');
    await expect(dialog.getByText(
      'Search across albums, photos, members, gear, events, scene, and tags',
    )).toBeVisible();

    const searchResponse = page.waitForResponse(
      (res) => {
        if (!res.url().includes('/api/search') || !res.ok()) return false;
        const url = new URL(res.url());
        return url.searchParams.get('q') === query;
      },
      { timeout: 20_000 },
    );
    await dialog.getByRole('searchbox').fill(query);
    await searchResponse;
    await expect(dialog.getByRole('heading', { name: 'Members', exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(dialog.locator(`a[href="/@${memberUser.nickname}"]`)).toBeVisible();
  });
});
