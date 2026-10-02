import { expect, test, type Page } from '@playwright/test';
import { generateTestEmail, getSignupPagePath, trackTestEmail } from './test-utils';

/** Staging can render two signup forms; use the one that contains the email field we fill. */
function signupForm(page: Page) {
  return page.locator('form').filter({ has: page.locator('input[type="email"]') }).first();
}

test.describe('Signup Flow', () => {
  let testEmail: string;
  let signupPath: string;

  test.beforeEach(async ({ request }) => {
    testEmail = generateTestEmail();
    signupPath = await getSignupPagePath(request);
  });

  test('should complete signup flow with email and password', async ({ page }) => {
    // Track email for cleanup
    trackTestEmail(testEmail);

    // Navigate to signup page
    await page.goto(signupPath);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible();

    // Find email input
    const emailInput = signupForm(page).locator('input[type="email"]');
    await emailInput.fill(testEmail);

    // Find password inputs - there should be two (password and confirm password)
    const passwordInputs = signupForm(page).locator('input[type="password"]');
    const passwordCount = await passwordInputs.count();

    // Fill first password field
    await passwordInputs.nth(0).fill('TestPassword123!');

    // Fill confirm password field (second password input)
    if (passwordCount > 1) {
      await passwordInputs.nth(1).fill('TestPassword123!');
    }

    // Submit the form
    await signupForm(page).locator('button[type="submit"]').click();

    // Wait for success message - the page shows "Check your email" heading
    await expect(
      page.getByRole('heading', { name: /check your email/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test('should show error when passwords do not match', async ({ page }) => {
    await page.goto(signupPath);
    await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible();

    const emailInput = signupForm(page).locator('input[type="email"]');
    await emailInput.fill(testEmail);

    const passwordInputs = signupForm(page).locator('input[type="password"]');
    await passwordInputs.nth(0).fill('TestPassword123!');
    await passwordInputs.nth(1).fill('DifferentPassword456!');

    await signupForm(page).locator('button[type="submit"]').click();

    // Should show password mismatch error
    await expect(
      signupForm(page).getByText(/password.*match|passwords.*not.*match/i),
    ).toBeVisible({ timeout: 5000 });
  });

  test('should show error for weak password', async ({ page }) => {
    await page.goto(signupPath);
    await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible();

    const emailInput = signupForm(page).locator('input[type="email"]');
    await emailInput.fill(testEmail);

    const passwordInputs = signupForm(page).locator('input[type="password"]');
    await passwordInputs.nth(0).fill('12345'); // Too short
    await passwordInputs.nth(1).fill('12345');

    await signupForm(page).locator('button[type="submit"]').click();

    // Should show password length error
    await expect(
      signupForm(page).getByText(/must be at least 6|password.*too short|password.*required/i),
    ).toBeVisible({ timeout: 5000 });
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.goto(signupPath);
    await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible();

    const emailInput = signupForm(page).locator('input[type="email"]');
    await emailInput.fill('invalid-email');

    const passwordInputs = signupForm(page).locator('input[type="password"]');
    await passwordInputs.nth(0).fill('TestPassword123!');
    await passwordInputs.nth(1).fill('TestPassword123!');

    await signupForm(page).locator('button[type="submit"]').click();

    // Browser's built-in validation prevents submission - verify we're still on signup page
    await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible();

    // Check the email input is invalid via JavaScript
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.checkValidity());
    expect(isInvalid).toBe(true);
  });
});
