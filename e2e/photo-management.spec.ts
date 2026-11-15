import path from 'path';

import { expect, test } from './fixtures/member-user';
import {
  deleteAllPhotos,
  deletePhotosFromOpenSidebar,
  dismissDriverTour,
  loginTestUser,
  photosUploadInput,
  setSidebarPhotoPublic,
  uploadPhotoInLibrary,
  waitForPhotoLibrary,
} from './test-utils';

test.describe('Photo Management Flow', () => {
  test('should upload a photo and add it to an album', async ({ page, memberUser }) => {
    test.setTimeout(60_000);

    // Login
    await loginTestUser(page, memberUser.email, memberUser.password);

    // Navigate to photos management page
    await page.goto('/account/photos');
    await expect(page).toHaveURL(/\/account\/photos/);

    // Wait for page to load
    await page.waitForLoadState('load');
    await waitForPhotoLibrary(page);
    await dismissDriverTour(page);

    const testImagePath = path.join(process.cwd(), 'e2e', 'test-uploads', 'file_example_JPG_100kB.jpg');
    const photoCard = await uploadPhotoInLibrary(page, testImagePath);
    await dismissDriverTour(page);
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
    // We can check by clicking the photo again and seeing the album in "In albums" section
    await photoCard.click();
    await expect(page.getByText(/in albums/i)).toBeVisible({ timeout: 5000 });

    // Make photo public so it appears on profile and homepage Recent photos
    const sidebar = page.locator('[data-testid="sidebar-panel"]').first();
    await setSidebarPhotoPublic(page, sidebar);

    const saveButton = sidebar.getByRole('button', { name: /^save$/i });
    await expect(saveButton).toBeEnabled({ timeout: 10_000 });
    await saveButton.click();
    await expect(page.getByRole('button', { name: /saved!/i })).toBeVisible({ timeout: 10000 });

    // Public profile shows the uploaded photo (role locator skips CSS-hidden
    // mobile/tablet grid copies that stay opacity-0 because they never load)
    await page.goto(`/@${memberUser.nickname}`);
    const profilePhoto = page.getByRole('link', {
      name: new RegExp(`View photo.*@${memberUser.nickname}`),
    }).first();
    await expect(profilePhoto).toBeVisible({ timeout: 15000 });

    // Homepage Recent photos includes the test user's upload. First paint can be
    // the public Suspense fallback (test photos filtered out); reload once if needed.
    await page.goto('/');
    const homePhotoLink = page.getByRole('link', {
      name: new RegExp(`View photo.*@${memberUser.nickname}`),
    }).first();
    if (!(await homePhotoLink.isVisible())) {
      await page.reload();
    }
    await expect(homePhotoLink).toBeVisible({ timeout: 15000 });

    // Return to account photos to clean up (re-resolve the card — locators from before navigation can go stale).
    await page.goto('/account/photos');
    await page.waitForLoadState('load');
    const photoCards = await waitForPhotoLibrary(page);
    await dismissDriverTour(page);
    await photoCards.first().click();
    await deletePhotosFromOpenSidebar(page);

    // Note: Album cleanup is handled automatically when the test user is deleted
    // since albums cascade delete with the user

    console.log('✅ Photo management test completed successfully');
  });

  test('should handle bulk photo selection and add to album', async ({ page, memberUser }) => {
    test.setTimeout(120_000);

    // Login
    await loginTestUser(page, memberUser.email, memberUser.password);

    // Navigate to photos management page
    await page.goto('/account/photos');
    await expect(page).toHaveURL(/\/account\/photos/);

    // The shared member can still have photos from the previous test once the grid finishes loading.
    await deleteAllPhotos(page);
    await dismissDriverTour(page);
    const photoCards = page.locator('[data-testid="photo-card"]');

    // Upload two test images
    const testImagePath1 = path.join(process.cwd(), 'e2e', 'test-uploads', 'file_example_JPG_100kB.jpg');
    const testImagePath2 = path.join(process.cwd(), 'e2e', 'test-uploads', 'file_example_JPG_39kB.jpg');

    const fileInput = photosUploadInput(page);
    await fileInput.setInputFiles([testImagePath1, testImagePath2]);

    // Wait for both uploads to complete - wait for exactly 2 photo cards
    await expect(photoCards).toHaveCount(2, { timeout: 60000 });

    await dismissDriverTour(page);

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

    await deletePhotosFromOpenSidebar(page);

    console.log('✅ Bulk photo selection test completed successfully');
  });

  test('filters the library to public photos and clears the filter', async ({ page, memberUser }) => {
    test.setTimeout(60_000);
    await loginTestUser(page, memberUser.email, memberUser.password);
    await page.goto('/account/photos');
    await deleteAllPhotos(page);
    await dismissDriverTour(page);

    const testImagePath = path.join(process.cwd(), 'e2e', 'test-uploads', 'file_example_JPG_100kB.jpg');
    await uploadPhotoInLibrary(page, testImagePath);
    const photoCards = page.locator('[data-testid="photo-card"]');
    await dismissDriverTour(page);

    await page.getByRole('button', { name: 'Filter photos' }).first().click();
    const dialog = page.locator('dialog[open]');
    await expect(dialog.getByRole('heading', { name: 'Filter photos' })).toBeVisible();
    await dialog.getByRole('combobox', { name: /visibility/i }).click();
    await page.getByRole('option', { name: 'Public', exact: true }).click();
    await dialog.getByRole('button', { name: 'Apply', exact: true }).click();
    await expect(dialog).not.toBeVisible();

    await expect(page.getByText('No photos match your filters')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(photoCards).toHaveCount(1, { timeout: 15_000 });

    await deleteAllPhotos(page);
  });

  test('opens capture details and the map picker', async ({ page, memberUser }) => {
    test.setTimeout(60_000);
    await loginTestUser(page, memberUser.email, memberUser.password);
    await page.goto('/account/photos');
    await deleteAllPhotos(page);
    await dismissDriverTour(page);

    const testImagePath = path.join(process.cwd(), 'e2e', 'test-uploads', 'file_example_JPG_100kB.jpg');
    const photoCard = await uploadPhotoInLibrary(page, testImagePath);
    await dismissDriverTour(page);
    await photoCard.click();

    const sidebar = page.locator('[data-testid="sidebar-panel"]').first();
    await expect(sidebar).toBeVisible();
    await sidebar.locator('#photos-tour-edit-form').getByRole('button', { name: 'Edit capture details' }).click();
    await expect(page.getByRole('heading', { name: 'Capture details', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Choose on map' }).click();
    const mapDialog = page.locator('dialog[open]').filter({
      has: page.getByRole('heading', { name: 'Choose location' }),
    });
    await expect(mapDialog.getByRole('heading', { name: 'Choose location' })).toBeVisible({
      timeout: 15_000,
    });
    await mapDialog.getByRole('button', { name: 'Cancel', exact: true }).first().click();
    await expect(mapDialog).not.toBeVisible();

    await page.goto('/account/photos');
    await deleteAllPhotos(page);
  });
});
