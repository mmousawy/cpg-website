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
    const memberProfileUrl = `/@${memberUser.nickname}`;
    const searchResponse = page.waitForResponse(
      (res) => {
        if (!res.url().includes('/api/search') || !res.ok()) return false;
        const url = new URL(res.url());
        return url.searchParams.get('q') === query;
      },
      { timeout: 20_000 },
    );
    await dialog.getByRole('searchbox').fill(query);
    const response = await searchResponse;
    const payload = (await response.json()) as {
      results?: Array<{ entity_type: string; url?: string | null }>;
    };
    expect(
      payload.results?.some(
        (r) => r.entity_type === 'members' && r.url === memberProfileUrl,
      ),
    ).toBeTruthy();

    await expect(
      dialog.getByRole('link', { name: new RegExp(`@${memberUser.nickname}`) }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
