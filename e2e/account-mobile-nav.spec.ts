import { expect, test } from './fixtures/member-user';

import { loginTestUser } from './test-utils';

test.describe('Account mobile section nav', () => {
  test('scrolls to the selected section on mobile', async ({ page, memberUser }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginTestUser(page, memberUser.email, memberUser.password);

    await page.goto('/account');
    await expect(page.getByRole('heading', { name: 'Account settings' })).toBeVisible();
    // Wait for the account form content to finish loading (isLoading = false)
    // so all section elements are in the DOM before we interact with the nav.
    await page.locator('#copyright').waitFor({ state: 'attached', timeout: 15000 });

    const readScrollTop = () => page.evaluate(() => {
      const pinned = document.documentElement.classList.contains('mobile-pinned-shell');
      const main = document.getElementById('main-content');
      if (pinned && main) return main.scrollTop;
      return window.scrollY;
    });

    const startingScrollY = await readScrollTop();

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

    const endingScrollY = await readScrollTop();
    expect(endingScrollY).toBeGreaterThan(startingScrollY + 100);
  });
});
