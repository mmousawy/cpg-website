import { expect, test, type Page } from '@playwright/test';
import path from 'path';

import {
  cleanupTestUsers,
  createTestUser,
  getSignupPagePath,
  isStagingE2ETarget,
  loginTestUser,
  type TestUser,
} from './test-utils';

const TEST_AVATAR_PATH = path.join(process.cwd(), 'e2e', 'test-uploads', 'file_example_JPG_39kB.jpg');
const TEST_BANNER_PATH = path.join(process.cwd(), 'e2e', 'test-uploads', 'file_example_JPG_100kB.jpg');

const ONBOARDING = {
  fullName: 'Mila Street',
  bio: 'I shoot 35mm on rainy days in Rotterdam.',
  interests: ['street', 'film'] as const,
};

function imageSection(page: Page, testId: 'profile-picture-section' | 'banner-image-section') {
  return page.getByTestId(testId);
}

async function cropAndApply(page: Page, title: RegExp) {
  const dialog = page.locator('dialog[open]');
  await expect(dialog.getByRole('heading', { name: title })).toBeVisible({ timeout: 10000 });
  const applyButton = dialog.getByRole('button', { name: /^apply$/i });
  await expect(applyButton).toBeEnabled({ timeout: 30000 });
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

async function startOnboardingWizard(page: Page) {
  await page.getByRole('button', { name: /let's go/i }).click();
  await expect(page.getByRole('heading', { name: 'Creative Photography Group', exact: true })).toBeVisible();
}

async function continueOnboardingWizard(page: Page) {
  const continueButton = page.getByRole('button', { name: /^continue$/i });
  await expect(continueButton).toBeEnabled({ timeout: 10000 });
  await continueButton.click();
}

async function addInterest(page: Page, interest: string) {
  const input = page.locator('#interests');
  await input.fill(interest);
  await input.press('Enter');
  await expect(page.getByRole('button', { name: `Remove ${interest} interest` })).toBeVisible();
}

async function fillProfileStep(page: Page, nickname: string, fullName = ONBOARDING.fullName) {
  await page.locator('#nickname').fill(nickname);
  await expect(page.getByText(/nickname is available/i)).toBeVisible({ timeout: 10000 });
  await page.locator('#fullName').fill(fullName);
  await page.locator('#bio').fill(ONBOARDING.bio);
  for (const interest of ONBOARDING.interests) {
    await addInterest(page, interest);
  }
  const emailInput = page.locator('#email');
  if (await emailInput.isVisible()) {
    const current = await emailInput.inputValue();
    if (!current.trim()) {
      await emailInput.fill('oauth-onboarding@example.com');
    }
  }
}

async function fillStyleStep(page: Page, options?: { keepBanner?: boolean; skipImages?: boolean }) {
  await expect(page.getByRole('heading', { name: /^appearance$/i })).toBeVisible();
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await expect(page.getByText(/always uses the dark theme/i)).toBeVisible();
  await page.getByRole('button', { name: /^Reduce\b/ }).click();
  await expect(page.getByRole('button', { name: /^Reduce\b/ })).toHaveClass(/border-primary/);

  if (options?.skipImages) return;

  await uploadProfileImage(page, 'profile-picture-section', /crop avatar/i, TEST_AVATAR_PATH);
  await uploadProfileImage(page, 'banner-image-section', /crop banner/i, TEST_BANNER_PATH);

  // Staging storage is missing the user-banners bucket; Join fails if a banner is pending.
  const keepBanner = options?.keepBanner ?? !isStagingE2ETarget();
  if (!keepBanner) {
    await removeProfileImage(page, 'banner-image-section', /remove banner/i);
  }
}

async function fillEmailPreferencesStep(page: Page) {
  await expect(page.getByRole('heading', { name: /email preferences/i })).toBeVisible();
  const checkboxes = page.locator('[id^="emailPref-"]');
  await expect(checkboxes.first()).toBeVisible({ timeout: 15000 });

  const count = await checkboxes.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    const box = checkboxes.nth(i);
    if (await box.isChecked()) {
      await box.uncheck();
    }
  }

  for (let i = 0; i < count; i++) {
    const box = checkboxes.nth(i);
    const id = await box.getAttribute('id');
    if (id !== 'emailPref-newsletter') {
      await box.check();
    }
  }

  await expect(page.locator('#emailPref-newsletter')).not.toBeChecked();
}

async function fillFinishStep(page: Page) {
  await expect(page.getByRole('heading', { name: /one last step/i })).toBeVisible();
  await page.locator('#terms-accepted').check();
  await expect(page.locator('#terms-accepted')).toBeChecked();
}

async function fillAllOnboardingSteps(
  page: Page,
  nickname: string,
  options?: { keepBanner?: boolean; fullName?: string },
) {
  await startOnboardingWizard(page);
  await fillProfileStep(page, nickname, options?.fullName);
  await continueOnboardingWizard(page);
  await fillStyleStep(page, { keepBanner: options?.keepBanner });
  await continueOnboardingWizard(page);
  await fillEmailPreferencesStep(page);
  await continueOnboardingWizard(page);
  await fillFinishStep(page);
}

async function expectPersistedOnboardingOnAccount(page: Page, nickname: string) {
  await expect(page.getByRole('heading', { name: /account settings/i })).toBeVisible();
  await expect(page.locator('#fullName')).toHaveValue(ONBOARDING.fullName, { timeout: 15000 });
  await expect(page.locator('#nickname')).toHaveValue(nickname);
  await expect(page.locator('#bio')).toHaveValue(ONBOARDING.bio);

  for (const interest of ONBOARDING.interests) {
    await expect(page.getByRole('button', { name: `Remove ${interest} interest` })).toBeVisible();
  }

  await expect(page.getByText(/always uses the dark theme/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Reduce\b/ })).toHaveClass(/border-primary/);

  await expect(page.locator('#emailPref-newsletter')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#emailPref-newsletter')).not.toBeChecked();
  const otherPrefs = page.locator('[id^="emailPref-"]:not(#emailPref-newsletter)');
  const otherCount = await otherPrefs.count();
  expect(otherCount).toBeGreaterThan(0);
  for (let i = 0; i < otherCount; i++) {
    await expect(otherPrefs.nth(i)).toBeChecked();
  }

  if (!isStagingE2ETarget()) {
    const pictureSection = imageSection(page, 'profile-picture-section');
    await expect(pictureSection.getByRole('button', { name: /remove profile picture/i })).toBeVisible();
    await expect(pictureSection.locator('img')).toBeVisible();
  }

  if (!isStagingE2ETarget()) {
    const bannerSection = imageSection(page, 'banner-image-section');
    await expect(bannerSection.getByRole('button', { name: /remove banner/i })).toBeVisible();
    await expect(bannerSection.locator('img')).toBeVisible();
  }
}

test.describe('Onboarding Flow', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page).toHaveURL(/.*login/i, { timeout: 10000 });
  });

  test('should show onboarding in preview mode without authentication', async ({ page }) => {
    await page.goto('/onboarding?preview=true');

    await expect(page).toHaveURL(/\/onboarding\?preview=true/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /welcome to.*creative photography group/i })).toBeVisible();
    await expect(page.getByText(/preview mode:/i)).toBeVisible();
  });

  test('should fill every onboarding step in preview mode', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/onboarding?preview=true');
    await expect(page.getByRole('button', { name: /let's go/i })).toBeVisible();

    await fillAllOnboardingSteps(page, `preview-${Date.now()}`, { keepBanner: true });

    const completeButton = page.getByRole('button', { name: /test form validation/i });
    await expect(completeButton).toBeEnabled();

    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toMatch(/validation passed/i);
      await dialog.accept();
    });
    await completeButton.click();
  });

  test('should have proper navigation from signup to onboarding flow', async ({ page, request }) => {
    await page.goto(await getSignupPagePath(request));

    await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible();

    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });
});

test.describe('Onboarding with incomplete profile', () => {
  test.describe.configure({ mode: 'serial' });

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

  test('should land on onboarding when redirectTo is a public page', async ({ page }) => {
    await page.goto('/login?redirectTo=/members');

    await page.locator('input[type="email"]').first().fill(testUser.email);
    await page.locator('input[type="password"]').first().fill(testUser.password);
    const submitButton = page.getByRole('button', { name: 'Log in', exact: true });
    await submitButton.click();

    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /welcome to.*creative photography group/i })).toBeVisible();
  });

  test('should fill every onboarding field and persist them after joining', async ({ page }) => {
    test.setTimeout(120000);

    await loginTestUser(page, testUser.email, testUser.password);
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /welcome to.*creative photography group/i })).toBeVisible();

    await startOnboardingWizard(page);
    await fillProfileStep(page, testUser.nickname);
    await continueOnboardingWizard(page);

    // Staging storage rejects avatar/banner uploads, which blocks Join.
    const skipImages = isStagingE2ETarget();
    await fillStyleStep(page, { skipImages });
    if (!skipImages) {
      await uploadProfileImage(page, 'profile-picture-section', /crop avatar/i, TEST_AVATAR_PATH);
      await removeProfileImage(page, 'profile-picture-section', /remove profile picture/i);
      await uploadProfileImage(page, 'profile-picture-section', /crop avatar/i, TEST_AVATAR_PATH);
    }

    await continueOnboardingWizard(page);
    await fillEmailPreferencesStep(page);
    await continueOnboardingWizard(page);
    await fillFinishStep(page);

    const completeButton = page.getByRole('button', { name: /join the group/i });
    await expect(completeButton).toBeEnabled();
    await completeButton.click();
    await expect(page).toHaveURL(/\/account/, { timeout: 45000 });
    await expect(page.getByText(/failed to upload/i)).toHaveCount(0);

    await page.goto('/account');
    await expectPersistedOnboardingOnAccount(page, testUser.nickname);
  });
});
