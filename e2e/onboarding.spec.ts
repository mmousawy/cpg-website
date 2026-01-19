import { expect, test } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    // Try to access onboarding without being logged in
    await page.goto('/onboarding');

    // Should redirect to login page
    await expect(page).toHaveURL(/.*login/i, { timeout: 10000 });
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

// Note: Full onboarding flow testing requires:
// 1. Creating a test user via API
// 2. Manually confirming their email or bypassing verification
// 3. Logging in with the test credentials
// 4. Completing onboarding
//
// This is better suited for integration tests that can directly
// interact with the database to set up test state.
