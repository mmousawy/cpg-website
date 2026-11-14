import path from 'path';

import { expect, test } from './fixtures/member-user';
import {
  cleanupTestUsers,
  createTestUser,
  dismissDriverTour,
  expectVisiblePhotoMemberTag,
  loginTestUser,
  searchMemberInTagPicker,
  uploadPhotoInLibrary,
  waitForPhotoLibrary,
  waitForTagPeopleModal,
  type TestUser,
} from './test-utils';

test.describe('Mentions and photo tags', () => {
  let taggedMember: TestUser;

  test.beforeAll(async ({ request }) => {
    taggedMember = await createTestUser(request);
  });

  test.afterAll(async ({ request }) => {
    if (taggedMember?.email) {
      await cleanupTestUsers(request, [taggedMember.email]);
    }
  });

  test('mentions a member in a comment and tags them on the photo', async ({ page, memberUser }) => {
    test.setTimeout(120_000);
    await loginTestUser(page, memberUser.email, memberUser.password);

    await page.goto('/account');
    await expect(page.locator('#allow-member-tags')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(
      'Allow other members to tag you in comments, descriptions, and photos',
    )).toBeVisible();

    await page.goto('/account/photos');
    await page.waitForLoadState('load');
    await waitForPhotoLibrary(page);
    await dismissDriverTour(page);

    const testImagePath = path.join(process.cwd(), 'e2e', 'test-uploads', 'file_example_JPG_100kB.jpg');
    const photoCard = await uploadPhotoInLibrary(page, testImagePath);
    await dismissDriverTour(page);
    await photoCard.click();

    const sidebar = page.locator('[data-testid="sidebar-panel"]').first();
    await expect(sidebar).toBeVisible();
    const visibilityToggle = sidebar.getByLabel('Toggle Private and Public');
    if (!(await visibilityToggle.isChecked())) {
      await visibilityToggle.check({ force: true });
    }
    await expect(visibilityToggle).toBeChecked({ timeout: 10_000 });
    const saveButton = sidebar.getByRole('button', { name: /^save$/i });
    await expect(saveButton).toBeEnabled({ timeout: 5000 });
    await saveButton.click();
    await expect(page.getByRole('button', { name: /saved!/i })).toBeVisible({ timeout: 10_000 });

    await page.goto(`/@${memberUser.nickname}`);
    const photoLink = page.getByRole('link', {
      name: new RegExp(`View photo.*@${memberUser.nickname}`),
    }).first();
    await expect(photoLink).toBeVisible({ timeout: 15_000 });
    await photoLink.click();
    await expect(page).toHaveURL(/\/photo\//);
    const photoPageUrl = page.url();

    const composer = page.getByRole('textbox').last();
    await composer.click();
    await composer.pressSequentially(`@${taggedMember.nickname}`, { delay: 20 });
    await page.getByRole('option', { name: new RegExp(`@${taggedMember.nickname}`) }).click({
      timeout: 10_000,
    });
    await page.getByRole('button', { name: 'Post', exact: true }).click();
    await expect(page.getByRole('link', { name: `@${taggedMember.nickname}`, exact: true })).toBeVisible({
      timeout: 15_000,
    });

    await page.goto('/account/photos');
    await waitForPhotoLibrary(page);
    await dismissDriverTour(page);
    const uploadedCard = page.locator('[data-testid="photo-card"]').first();
    await uploadedCard.click();

    const editSidebar = page.locator('[data-testid="sidebar-panel"]').first();
    await editSidebar.getByRole('button', { name: 'Tag people' }).click();

    const tagDialog = await waitForTagPeopleModal(page);
    await tagDialog.locator('.cursor-crosshair').click({ position: { x: 40, y: 40 } });
    await searchMemberInTagPicker(page, taggedMember.nickname);
    await tagDialog.getByRole('button', { name: 'Save' }).click();
    await expect(tagDialog).not.toBeVisible({ timeout: 10_000 });

    await page.goto(photoPageUrl);
    await expectVisiblePhotoMemberTag(page, taggedMember.nickname);

    await page.goto(`/@${taggedMember.nickname}`);
    await expect(page.getByRole('heading', { name: 'Tagged', exact: true })).toBeVisible({
      timeout: 15_000,
    });

    await page.goto('/account/photos');
    await waitForPhotoLibrary(page);
    await dismissDriverTour(page);
    const uploaded = page.locator('[data-testid="photo-card"]').first();
    await uploaded.click();
    await page.locator('[data-testid="sidebar-panel"]').getByRole('button', { name: /delete/i }).click();
    const confirmDialog = page.locator('dialog[open]');
    await confirmDialog.getByRole('button', { name: /delete/i }).click();
    await expect(page.locator('[data-testid="photo-card"]')).toHaveCount(0, { timeout: 15_000 });
  });
});
