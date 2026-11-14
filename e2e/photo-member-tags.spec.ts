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
  waitForTagPeopleModal,
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

  return waitForTagPeopleModal(page);
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

  await tagDialog.getByRole('button', { name: 'Save' }).click();
  await expect(tagDialog).not.toBeVisible({ timeout: 15_000 });
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

  memberTest('closing the modal dismisses an open tag search box', async ({ page, memberUser }) => {
    memberTest.setTimeout(120_000);
    await loginTestUser(page, memberUser.email, memberUser.password);

    const tagDialog = await openTagPeopleModal(page);
    await tagDialog.locator('.cursor-crosshair').click({ position: { x: 40, y: 40 } });
    await expect(page.locator('[data-tag-picker-input]')).toBeVisible();

    await tagDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(tagDialog).not.toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-tag-picker-input]')).toHaveCount(0, { timeout: 5_000 });
  });

  memberTest('closing with unsaved tag edits asks for confirmation', async ({ page, memberUser }) => {
    memberTest.setTimeout(120_000);
    await loginTestUser(page, memberUser.email, memberUser.password);

    const tagDialog = await openTagPeopleModal(page);
    await tagDialog.locator('.cursor-crosshair').click({ position: { x: 40, y: 40 } });
    await searchMemberInTagPicker(page, taggedMember.nickname);
    await expect(
      tagDialog.getByRole('button', { name: `Tagged ${taggedMember.nickname}` }),
    ).toBeVisible({ timeout: 15_000 });

    await page.keyboard.press('Escape');
    const unsavedDialog = page.getByRole('heading', { name: 'Unsaved changes' });
    await expect(unsavedDialog).toBeVisible({ timeout: 10_000 });

    await page.locator('dialog').filter({ has: unsavedDialog }).getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(unsavedDialog).toHaveCount(0);
    await expect(tagDialog).toBeVisible();
    await expect(
      tagDialog.getByRole('button', { name: `Tagged ${taggedMember.nickname}` }),
    ).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(unsavedDialog).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Leave' }).click();
    await expect(tagDialog).not.toBeVisible({ timeout: 10_000 });
  });
});
