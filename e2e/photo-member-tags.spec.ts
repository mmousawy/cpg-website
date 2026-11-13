import path from 'path';

import { expect } from '@playwright/test';

import { test as memberTest } from './fixtures/member-user';
import {
  cleanupTestUsers,
  createTestUser,
  dismissDriverTour,
  loginTestUser,
  searchMemberInTagPicker,
  uploadPhotoInLibrary,
  waitForPhotoLibrary,
  type TestUser,
} from './test-utils';

const testImagePath = path.join(process.cwd(), 'e2e', 'test-uploads', 'file_example_JPG_100kB.jpg');

const MOBILE_VIEWPORT = { width: 393, height: 851 };

async function openTagPeopleModal(
  page: import('@playwright/test').Page,
  options?: { mobile?: boolean },
) {
  await page.goto('/account/photos');
  await page.waitForLoadState('load');
  await waitForPhotoLibrary(page);
  await dismissDriverTour(page);

  const card = await uploadPhotoInLibrary(page, testImagePath);
  await dismissDriverTour(page);
  await card.click();

  if (options?.mobile) {
    // Mobile action bar is icon-only below `md` — use the stable tour id.
    await page.locator('#photos-tour-mobile-edit').click();
  }

  const sidebar = page.locator('[data-testid="sidebar-panel"]').last();
  await expect(sidebar.getByRole('button', { name: 'Tag people' })).toBeVisible({ timeout: 15_000 });
  await sidebar.getByRole('button', { name: 'Tag people' }).click();

  const tagDialog = page.locator('dialog[open]').filter({
    has: page.getByRole('heading', { name: 'Tag people' }),
  });
  await expect(tagDialog.getByText('Click the photo to place a tag')).toBeVisible();
  return tagDialog;
}

async function assertPickerTagsMemberInModal(
  page: import('@playwright/test').Page,
  memberUser: TestUser,
  taggedNickname: string,
  options?: { mobile?: boolean },
) {
  await loginTestUser(page, memberUser.email, memberUser.password);

  const tagDialog = await openTagPeopleModal(page, options);
  await tagDialog.locator('.cursor-crosshair').click({ position: { x: 40, y: 40 } });
  await searchMemberInTagPicker(page, taggedNickname);

  await expect(
    tagDialog.getByRole('button', { name: `Tagged ${taggedNickname}` }),
  ).toBeVisible({ timeout: 15_000 });
}

memberTest.describe('Photo member tag picker', () => {
  let taggedMember: TestUser;

  memberTest.beforeAll(async ({ request }) => {
    taggedMember = await createTestUser(request);
  });

  memberTest.afterAll(async ({ request }) => {
    if (taggedMember?.email) {
      await cleanupTestUsers(request, [taggedMember.email]);
    }
  });

  memberTest('desktop: picker search is clickable and typable in the modal', async ({ page, memberUser }) => {
    memberTest.setTimeout(120_000);
    await assertPickerTagsMemberInModal(page, memberUser, taggedMember.nickname);
  });

  memberTest('mobile viewport: picker search is clickable and typable in the modal', async ({ page, memberUser }) => {
    memberTest.setTimeout(120_000);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await assertPickerTagsMemberInModal(page, memberUser, taggedMember.nickname, { mobile: true });
  });
});
