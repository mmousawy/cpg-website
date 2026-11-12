import { expect, test } from '@playwright/test';

const PUBLIC_PAGES: Array<{ path: string; heading: string | RegExp }> = [
  { path: '/', heading: /Creative Photography Group/i },
  { path: '/gallery', heading: 'Photo gallery' },
  { path: '/gallery/photos', heading: 'Community photos' },
  { path: '/events', heading: 'Events' },
  { path: '/scene', heading: 'Scene' },
  { path: '/challenges', heading: 'Photo challenges' },
  { path: '/members', heading: 'Members' },
  { path: '/help', heading: 'Help & FAQ' },
];

test.describe('Public pages', () => {
  test('logged-out visitors can open the main sections', async ({ page }) => {
    test.setTimeout(60_000);

    for (const route of PUBLIC_PAGES) {
      await page.goto(route.path);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.getByRole('heading', {
        name: route.heading,
        exact: typeof route.heading === 'string',
      }).first()).toBeVisible();
    }
  });
});
