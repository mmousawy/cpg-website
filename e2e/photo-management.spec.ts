import { expect, test } from '@playwright/test';
import path from 'path';
import { createTestUser, loginTestUser, type TestUser } from './test-utils';

test.describe('Photo Management Flow', () => {
  let testUser: TestUser;
  let baseUrl: string;
  let bypassToken: string | undefined;

  test.beforeAll(async ({ }, testInfo) => {
    // Get base URL from config
    baseUrl = testInfo.project.use.baseURL || 'http://localhost:3000';
    bypassToken = process.env.VERCEL_BYPASS_TOKEN;

    // Create a test user for all tests in this suite
    testUser = await createTestUser(baseUrl, bypassToken);
    console.log(`Created test user: ${testUser.email}`);
  });

  test.afterAll(async () => {
    // Cleanup test user data explicitly (photos, albums, etc.)
    // This ensures cleanup happens even if individual tests fail
    if (testUser && baseUrl) {
      try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (bypassToken) {
          headers['x-vercel-protection-bypass'] = bypassToken;
        }

        await fetch(`${baseUrl}/api/test/cleanup`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ emails: [testUser.email] }),
        });
        console.log(`Cleaned up test user: ${testUser.email}`);
      } catch (err) {
        console.error('Failed to cleanup test user:', err);
      }
    }
  });

  test('should upload a photo and add it to an album', async ({ page }) => {
    // Login
    await loginTestUser(page, testUser.email, testUser.password);

    // Navigate to photos management page
    await page.goto('/account/photos');
    await expect(page).toHaveURL(/\/account\/photos/);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Get the test image path (using dedicated test images)
    const testImagePath = path.join(process.cwd(), 'e2e', 'test-uploads', 'file_example_JPG_100kB.jpg');

    // Find the file input and upload
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);

    // Wait for upload to complete - look for the photo to appear in the grid
    // The photo card should appear after upload
    await expect(page.locator('[data-testid="photo-card"]').or(
      page.locator('.group').filter({ has: page.locator('img') }),
    ).first()).toBeVisible({ timeout: 30000 });

    // Click on the uploaded photo to select it
    const photoCard = page.locator('[data-testid="photo-card"]').or(
      page.locator('.group').filter({ has: page.locator('img') }),
    ).first();
    await photoCard.click();

    // Wait for sidebar to show the edit form
    await expect(page.locator('[data-testid="sidebar-panel"]').first()).toBeVisible({ timeout: 5000 });

    // Click the "Album" button to open the add to album modal
    const albumButton = page.getByRole('button', { name: /album/i }).first();
    await expect(albumButton).toBeVisible();
    await albumButton.click();

    // Wait for modal to appear
    await expect(page.getByText(/add to album/i)).toBeVisible({ timeout: 5000 });

    // Create a new album via the modal - use specific role selector
    const newAlbumInput = page.getByRole('textbox', { name: /album title/i });
    await expect(newAlbumInput).toBeVisible();

    const testAlbumName = `Test Album ${Date.now()}`;
    await newAlbumInput.fill(testAlbumName);

    // Click create button
    const createButton = page.getByRole('button', { name: /create/i });
    await createButton.click();

    // Wait for album to be created and selected
    await expect(page.getByText(testAlbumName)).toBeVisible({ timeout: 5000 });

    // The newly created album should be checked/selected
    // Click the "Add to X album" button
    const addButton = page.getByRole('button', { name: /add to.*album/i });
    await expect(addButton).toBeEnabled({ timeout: 5000 });
    await addButton.click();

    // Modal should close
    await expect(page.getByText(/add to album/i)).not.toBeVisible({ timeout: 5000 });

    // Verify success - the photo should now be associated with the album
    // We can check by clicking the photo again and seeing the album in "Part of" section
    await photoCard.click();
    await expect(page.getByRole('heading', { name: /part of/i })).toBeVisible({ timeout: 5000 });

    // Clean up: Delete the photo
    const deleteButton = page.getByRole('button', { name: /delete/i }).first();
    await deleteButton.click();

    // Wait for confirm dialog and click confirm
    const confirmDialog = page.locator('[role="dialog"]').or(page.locator('dialog[open]'));
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });
    const confirmButton = confirmDialog.getByRole('button', { name: /delete/i });
    await confirmButton.click();

    // Wait for photo to be deleted and ensure deletion is complete
    const photoCardsAfterDelete = page.locator('[data-testid="photo-card"]');
    await expect(photoCardsAfterDelete).toHaveCount(0, { timeout: 10000 });

    // Wait for network to be idle to ensure all deletion requests have completed
    await page.waitForLoadState('networkidle');

    // Verify count is still 0 (double-check after network settles)
    const finalCount = await photoCardsAfterDelete.count();
    if (finalCount > 0) {
      throw new Error(`Expected 0 photos after deletion, but found ${finalCount}`);
    }

    // Note: Album cleanup is handled automatically when the test user is deleted
    // since albums cascade delete with the user

    console.log('✅ Photo management test completed successfully');
  });

  test('should handle bulk photo selection and add to album', async ({ page }) => {
    // Login
    await loginTestUser(page, testUser.email, testUser.password);

    // Navigate to photos management page
    await page.goto('/account/photos');
    await expect(page).toHaveURL(/\/account\/photos/);
    await page.waitForLoadState('networkidle');

    // Clean up any existing photos from previous tests
    // This ensures we start with a clean state
    const photoCards = page.locator('[data-testid="photo-card"]');
    const initialCount = await photoCards.count();

    if (initialCount > 0) {
      console.log(`Cleaning up ${initialCount} leftover photo(s) from previous test`);
      try {
        // Select all photos and delete them
        // First, select the first photo
        await photoCards.first().click();
        await expect(page.locator('[data-testid="sidebar-panel"]').first()).toBeVisible({ timeout: 5000 });

        // If there are multiple photos, select them all with Ctrl+click
        if (initialCount > 1) {
          const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
          for (let i = 1; i < initialCount; i++) {
            await photoCards.nth(i).click({ modifiers: [modifier] });
          }
        }

        // Delete all selected photos
        const deleteButton = page.getByRole('button', { name: /delete/i }).first();
        await expect(deleteButton).toBeVisible({ timeout: 5000 });
        await deleteButton.click();

        // Confirm deletion
        const confirmDialog = page.locator('[role="dialog"]').or(page.locator('dialog[open]'));
        await expect(confirmDialog).toBeVisible({ timeout: 5000 });
        const confirmButton = confirmDialog.getByRole('button', { name: /delete/i });
        await confirmButton.click();

        // Wait for all photos to be deleted
        await expect(photoCards).toHaveCount(0, { timeout: 10000 });
        await page.waitForLoadState('networkidle');

        // Verify cleanup succeeded
        const finalCount = await photoCards.count();
        if (finalCount > 0) {
          throw new Error(`Failed to clean up photos: ${finalCount} photo(s) still remain`);
        }
      } catch (error) {
        console.error('Failed to clean up leftover photos:', error);
        throw error;
      }
    }

    // Upload two test images
    const testImagePath1 = path.join(process.cwd(), 'e2e', 'test-uploads', 'file_example_JPG_100kB.jpg');
    const testImagePath2 = path.join(process.cwd(), 'e2e', 'test-uploads', 'file_example_JPG_39kB.jpg');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([testImagePath1, testImagePath2]);

    // Wait for both uploads to complete - wait for exactly 2 photo cards
    await expect(photoCards).toHaveCount(2, { timeout: 60000 });

    // Select first photo with regular click (the first of the 2 newly uploaded photos)
    await photoCards.first().click();

    // Wait for sidebar to appear
    await expect(page.locator('[data-testid="sidebar-panel"]').first()).toBeVisible({ timeout: 5000 });

    // Select second photo with Ctrl+click (multi-select) or Cmd on Mac
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await photoCards.nth(1).click({ modifiers: [modifier] });

    // Should show bulk edit form - wait for the title to change
    await expect(page.getByRole('heading', { name: /edit 2 photos/i })).toBeVisible({ timeout: 5000 });

    // Click Album button for bulk add
    const albumButton = page.getByRole('button', { name: /album/i }).first();
    await expect(albumButton).toBeVisible();
    await albumButton.click();

    // Modal should open without infinite loop error
    const modalTitle = page.getByText(/add to album/i).first();
    await expect(modalTitle).toBeVisible({ timeout: 5000 });

    // Close modal by clicking Cancel button inside the modal
    const modal = page.locator('dialog[open]');
    const cancelButton = modal.getByRole('button', { name: /cancel/i });
    await cancelButton.click();

    // Wait for modal to close
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // Clean up: Delete the photos (both should still be selected)
    // First ensure we're back to the main view by waiting for sidebar
    await expect(page.locator('[data-testid="sidebar-panel"]').first()).toBeVisible({ timeout: 5000 });

    const deleteButton = page.getByRole('button', { name: /delete/i }).first();
    await deleteButton.click();

    // Wait for confirm dialog to appear and click the confirm button inside it
    const confirmDialog = page.locator('[role="dialog"]').or(page.locator('dialog[open]'));
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });

    const confirmButton = confirmDialog.getByRole('button', { name: /delete/i });
    await confirmButton.click();

    // Wait for deletion to complete
    await expect(photoCards).toHaveCount(0, { timeout: 10000 });

    console.log('✅ Bulk photo selection test completed successfully');
  });
});
