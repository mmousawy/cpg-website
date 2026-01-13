import { expect, test } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/login');

    // Check for login heading
    await expect(page.getByRole('heading', { name: /log in|sign in|welcome back/i })).toBeVisible();

    // Check for email input
    await expect(page.locator('input[type="email"]').first()).toBeVisible();

    // Check for password input
    await expect(page.locator('input[type="password"]').first()).toBeVisible();

    // Check for submit button
    await expect(
      page.locator('button[type="submit"]').or(
        page.getByRole('button', { name: /log in|sign in/i })
      )
    ).toBeVisible();

    // Check for signup link
    await expect(page.getByRole('link', { name: /sign up|create.*account|register/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill in invalid credentials
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('nonexistent@test.local');

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('wrongpassword123');

    // Submit the form
    const submitButton = page.locator('button[type="submit"]').or(
      page.getByRole('button', { name: /log in|sign in/i })
    );
    await submitButton.click();

    // Should show error message
    await expect(
      page.getByText(/invalid.*credentials|incorrect.*password|user.*not.*found|invalid.*email|unable|error/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/login');

    // Click signup link
    const signupLink = page.getByRole('link', { name: /sign up|create.*account|register/i });
    await signupLink.click();

    // Should be on signup page
    await expect(page).toHaveURL(/.*signup/);
    await expect(page.getByRole('heading', { name: /create.*account|sign up/i })).toBeVisible();
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto('/login');

    // Click forgot password link
    const forgotLink = page.getByRole('link', { name: /forgot.*password|reset.*password/i });
    await forgotLink.click();

    // Should be on forgot password page
    await expect(page).toHaveURL(/.*forgot-password/);
  });

  test('should show OAuth login options', async ({ page }) => {
    await page.goto('/login');

    // Check for Google login button
    await expect(
      page.getByRole('button', { name: /google/i }).or(
        page.locator('button:has-text("Google")')
      )
    ).toBeVisible();

    // Check for Discord login button
    await expect(
      page.getByRole('button', { name: /discord/i }).or(
        page.locator('button:has-text("Discord")')
      )
    ).toBeVisible();
  });
});
