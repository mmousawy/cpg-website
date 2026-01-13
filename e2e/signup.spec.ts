import { expect, test } from '@playwright/test';
import { generateTestEmail, trackTestEmail } from './test-utils';

test.describe('Signup Flow', () => {
  let testEmail: string;

  test.beforeEach(() => {
    testEmail = generateTestEmail();
  });

  test('should complete signup flow with email and password', async ({ page }) => {
    // Track email for cleanup
    trackTestEmail(testEmail);
    
    // Navigate to signup page
    await page.goto('/signup');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible();

    // Find email input
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill(testEmail);

    // Find password inputs - there should be two (password and confirm password)
    const passwordInputs = page.locator('input[type="password"]');
    const passwordCount = await passwordInputs.count();

    // Fill first password field
    await passwordInputs.nth(0).fill('TestPassword123!');

    // Fill confirm password field (second password input)
    if (passwordCount > 1) {
      await passwordInputs.nth(1).fill('TestPassword123!');
    }

    // Submit the form
    const submitButton = page.locator('button[type="submit"]').or(
      page.getByRole('button', { name: /sign up|create account/i }),
    );
    await submitButton.click();

    // Wait for success message - the page shows "Check your email" heading
    await expect(
      page.getByRole('heading', { name: /check your email/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test('should show error when passwords do not match', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible();

    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill(testEmail);

    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill('TestPassword123!');
    await passwordInputs.nth(1).fill('DifferentPassword456!');

    const submitButton = page.locator('button[type="submit"]').or(
      page.getByRole('button', { name: /sign up|create account/i }),
    );
    await submitButton.click();

    // Should show password mismatch error
    await expect(
      page.getByText(/password.*match|passwords.*not.*match/i),
    ).toBeVisible({ timeout: 5000 });
  });

  test('should show error for weak password', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible();

    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill(testEmail);

    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill('12345'); // Too short
    await passwordInputs.nth(1).fill('12345');

    const submitButton = page.locator('button[type="submit"]').or(
      page.getByRole('button', { name: /sign up|create account/i }),
    );
    await submitButton.click();

    // Should show password length error
    await expect(
      page.getByText(/password.*at least|password.*6|password.*too short|password.*required/i),
    ).toBeVisible({ timeout: 5000 });
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible();

    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('invalid-email');

    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill('TestPassword123!');
    await passwordInputs.nth(1).fill('TestPassword123!');

    const submitButton = page.locator('button[type="submit"]').or(
      page.getByRole('button', { name: /sign up|create account/i }),
    );
    await submitButton.click();

    // Browser's built-in validation prevents submission - verify we're still on signup page
    await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible();
    
    // Check the email input is invalid via JavaScript
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.checkValidity());
    expect(isInvalid).toBe(true);
  });
});
