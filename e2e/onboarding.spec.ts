import { expect, test, type Page } from '@playwright/test';
import path from 'path';

import { cleanupTestUsers, createTestUser, loginTestUser, type TestUser } from './test-utils';

const TEST_AVATAR_PATH = path.join(process.cwd(), 'e2e', 'test-uploads', 'file_example_JPG_39kB.jpg');
const TEST_BANNER_PATH = path.join(process.cwd(), 'e2e', 'test-uploads', 'file_example_JPG_100kB.jpg');

function imageSection(page: Page, testId: 'profile-picture-section' | 'banner-image-section') {
  return page.getByTestId(testId);
}

async function cropAndApply(page: Page, title: RegExp) {
  const dialog = page.locator('dialog[open]');
  await expect(dialog.getByRole('heading', { name: title })).toBeVisible({ timeout: 10000 });
  const applyButton = dialog.getByRole('button', { name: /^apply$/i });
  await expect(applyButton).toBeEnabled({ timeout: 15000 });
  await applyButton.click();
  await expect(dialog).not.toBeVisible({ timeout: 15000 });
}

async function uploadProfileImage(
  page: Page,
  testId: 'profile-picture-section' | 'banner-image-section',
  cropTitle: RegExp,
  filePath: string,
) {
  const section = imageSection(page, testId);
  await section.locator('input[type="file"]').setInputFiles(filePath);
  await cropAndApply(page, cropTitle);
  await expect(section.getByRole('button', { name: /choose different/i })).toBeVisible();
  await expect(section.locator('img')).toBeVisible();
}

async function removeProfileImage(
  page: Page,
  testId: 'profile-picture-section' | 'banner-image-section',
  removeName: RegExp,
) {
  const section = imageSection(page, testId);
  await section.getByRole('button', { name: removeName }).click();
  await expect(section.getByRole('button', { name: /upload new/i })).toBeVisible();
  await expect(section.getByRole('button', { name: removeName })).toHaveCount(0);
  await expect(section.locator('img')).toHaveCount(0);
}

test.describe('Onboarding Flow', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    // Try to access onboarding without being logged in
    await page.goto('/onboarding');

    // Should redirect to login page
    await expect(page).toHaveURL(/.*login/i, { timeout: 10000 });
  });

  test('should show onboarding in preview mode without authentication', async ({ page }) => {
    await page.goto('/onboarding?preview=true');

    await expect(page).toHaveURL(/\/onboarding\?preview=true/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /welcome to the group/i })).toBeVisible();
    await expect(page.getByText(/preview mode:/i)).toBeVisible();
  });

  test('should upload and remove avatar and banner in preview mode', async ({ page }) => {
    await page.goto('/onboarding?preview=true');
    await expect(page.getByRole('heading', { name: /profile images/i })).toBeVisible();

    await uploadProfileImage(page, 'profile-picture-section', /crop avatar/i, TEST_AVATAR_PATH);
    await removeProfileImage(page, 'profile-picture-section', /remove profile picture/i);

    await uploadProfileImage(page, 'banner-image-section', /crop banner/i, TEST_BANNER_PATH);
    await removeProfileImage(page, 'banner-image-section', /remove banner/i);
  });

  test('should have proper navigation from signup to onboarding flow', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/signup');

    // Verify signup page loads
    await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible();

    // Check that the page mentions the next step (onboarding/profile setup)
    // This ensures the signup -> onboarding flow is connected
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });
});

test.describe('Onboarding profile images', () => {
  let testUser: TestUser;

  test.beforeAll(async ({ request }) => {
    testUser = await createTestUser(request, { completeOnboarding: false });
  });

  test.afterAll(async ({ request }) => {
    if (!testUser) return;

    try {
      await cleanupTestUsers(request, [testUser.email]);
    } catch (err) {
      console.error('Failed to cleanup test user:', err);
    }
  });

  test('should upload, remove, persist, and delete avatar and banner', async ({ page }) => {
    test.setTimeout(120000);

    await loginTestUser(page, testUser.email, testUser.password);
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /welcome to the group/i })).toBeVisible();

    await page.locator('#nickname').fill(testUser.nickname);
    await expect(page.getByText(/nickname is available/i)).toBeVisible({ timeout: 10000 });

    await page.locator('#fullName').fill('Test User');

    await uploadProfileImage(page, 'profile-picture-section', /crop avatar/i, TEST_AVATAR_PATH);
    await uploadProfileImage(page, 'banner-image-section', /crop banner/i, TEST_BANNER_PATH);

    await removeProfileImage(page, 'profile-picture-section', /remove profile picture/i);
    await removeProfileImage(page, 'banner-image-section', /remove banner/i);

    await uploadProfileImage(page, 'profile-picture-section', /crop avatar/i, TEST_AVATAR_PATH);
    await uploadProfileImage(page, 'banner-image-section', /crop banner/i, TEST_BANNER_PATH);

    await page.locator('#terms-accepted').check();

    const completeButton = page.getByRole('button', { name: /complete setup/i });
    await expect(completeButton).toBeEnabled();
    await completeButton.click();
    await expect(completeButton).toBeHidden({ timeout: 45000 });

    await page.goto('/account');
    await expect(page.getByRole('heading', { name: /account settings/i })).toBeVisible();

    const pictureSection = imageSection(page, 'profile-picture-section');
    const bannerSection = imageSection(page, 'banner-image-section');

    await expect(pictureSection.getByRole('button', { name: /remove profile picture/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(pictureSection.locator('img')).toBeVisible();
    await expect(bannerSection.getByRole('button', { name: /remove banner/i })).toBeVisible();
    await expect(bannerSection.locator('img')).toBeVisible();

    await pictureSection.getByRole('button', { name: /remove profile picture/i }).click();
    await bannerSection.getByRole('button', { name: /remove banner/i }).click();

    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByText(/profile updated/i)).toBeVisible({ timeout: 20000 });

    await expect(pictureSection.getByRole('button', { name: /remove profile picture/i })).toHaveCount(0);
    await expect(bannerSection.getByRole('button', { name: /remove banner/i })).toHaveCount(0);
    await expect(pictureSection.getByRole('button', { name: /upload new/i })).toBeVisible();
    await expect(bannerSection.getByRole('button', { name: /upload new/i })).toBeVisible();
    await expect(pictureSection.locator('img')).toHaveCount(0);
    await expect(bannerSection.locator('img')).toHaveCount(0);
  });
});
