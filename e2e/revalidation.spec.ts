import { expect, test } from '@playwright/test';
import path from 'path';

import {
  cleanupTestUsers,
  createTestEventAsAdmin,
  createTestUser,
  deleteTestEvent,
  loginTestUser,
  type TestEvent,
  type TestUser,
} from './test-utils';

test.describe.configure({ mode: 'serial' });

test.describe('Revalidation smoke', () => {
  let adminUser: TestUser;
  let memberUser: TestUser;
  let secondUser: TestUser;
  const createdEvents: TestEvent[] = [];

  test.beforeAll(async ({ request }) => {
    adminUser = await createTestUser(request, { asAdmin: true });
    memberUser = await createTestUser(request);
    secondUser = await createTestUser(request);
  });

  test.afterAll(async ({ request, browser }) => {
    if (createdEvents.length > 0) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await loginTestUser(page, adminUser.email, adminUser.password);
      for (const event of createdEvents) {
        await deleteTestEvent(page.request, event);
      }
      await context.close();
    }

    await cleanupTestUsers(request, [
      adminUser.email,
      memberUser.email,
      secondUser.email,
    ]);
  });

  test('event publish reflects on /events and detail without hard refresh', async ({ page }) => {
    await loginTestUser(page, adminUser.email, adminUser.password);

    const title = `Smoke Event ${Date.now()}`;
    const event = await createTestEventAsAdmin(page.request, { title });
    createdEvents.push(event);

    const listing = await page.request.get('/events');
    expect(listing.ok()).toBeTruthy();
    expect(await listing.text()).toContain(title);

    const detail = await page.request.get(`/events/${event.slug}`);
    expect(detail.status()).toBe(200);
    expect(await detail.text()).toContain(title);

    await deleteTestEvent(page.request, event);
    createdEvents.pop();
  });

  test('RSVP updates event detail attendee list', async ({ page, browser }) => {
    await loginTestUser(page, adminUser.email, adminUser.password);

    const title = `RSVP Event ${Date.now()}`;
    const event = await createTestEventAsAdmin(page.request, { title });
    createdEvents.push(event);

    const memberContext = await browser.newContext();
    const memberPage = await memberContext.newPage();
    await loginTestUser(memberPage, memberUser.email, memberUser.password);

    const signup = await memberPage.request.post('/api/signup', {
      data: { event_id: event.id },
    });
    expect(signup.ok()).toBeTruthy();

    const detail = await page.request.get(`/events/${event.slug}`);
    expect(detail.ok()).toBeTruthy();
    expect(await detail.text()).toContain(memberUser.nickname);

    await memberContext.close();
    await deleteTestEvent(page.request, event);
    createdEvents.pop();
  });

  test('public photo upload appears on /gallery/photos and owner profile', async ({ page }) => {
    test.setTimeout(90_000);

    await loginTestUser(page, memberUser.email, memberUser.password);
    await page.goto('/account/photos');
    await page.waitForLoadState('networkidle');

    const testImagePath = path.join(
      process.cwd(),
      'e2e',
      'test-uploads',
      'file_example_JPG_100kB.jpg',
    );

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);

    const photoCard = page.locator('[data-testid="photo-card"]').or(
      page.locator('.group').filter({ has: page.locator('img') }),
    ).first();
    await expect(photoCard).toBeVisible({ timeout: 30_000 });
    await photoCard.click();

    const sidebar = page.locator('[data-testid="sidebar-panel"]').first();
    await expect(sidebar).toBeVisible({ timeout: 10_000 });

    const visibilityToggle = sidebar.getByLabel('Toggle Private and Public');
    if (!(await visibilityToggle.isChecked())) {
      await sidebar.getByRole('button', { name: 'Public', exact: true }).click();
    }
    await expect(visibilityToggle).toBeChecked();

    const saveButton = sidebar.getByRole('button', { name: /^save$/i });
    await expect(saveButton).toBeEnabled({ timeout: 10_000 });
    await saveButton.click();
    await expect(page.getByRole('button', { name: /saved!/i })).toBeVisible({ timeout: 15_000 });

    await page.goto(`/@${memberUser.nickname}`);
    const photoLink = page.getByRole('link', {
      name: new RegExp(`View photo.*@${memberUser.nickname}`),
    }).first();
    await expect(photoLink).toBeVisible({ timeout: 20_000 });

    const href = await photoLink.getAttribute('href');
    const shortIdMatch = href?.match(/\/photo\/([^/?#]+)/);
    expect(shortIdMatch?.[1]).toBeTruthy();
    const shortId = shortIdMatch![1];

    const galleryPhotos = await page.request.get('/gallery/photos');
    expect(galleryPhotos.ok()).toBeTruthy();
    expect(await galleryPhotos.text()).toContain(shortId);

    const profilePhotos = await page.request.get(`/@${memberUser.nickname}/photos`);
    expect(profilePhotos.ok()).toBeTruthy();
    expect(await profilePhotos.text()).toContain(shortId);
  });

  test('album like refreshes album detail like count', async ({ page, browser }) => {
    test.setTimeout(120_000);

    const ownerContext = await browser.newContext();
    const likerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    const likerPage = await likerContext.newPage();

    await loginTestUser(ownerPage, memberUser.email, memberUser.password);
    await ownerPage.goto('/account/albums');
    await ownerPage.waitForLoadState('networkidle');

    const albumTitle = `Revalidation Album ${Date.now()}`;
    // Empty albums page renders the same CTA in the toolbar and empty state.
    await ownerPage.getByRole('button', { name: /new album/i }).first().click();
    await ownerPage.getByLabel(/^title/i).fill(albumTitle);
    await ownerPage.getByRole('button', { name: /create album/i }).click();
    const albumLink = ownerPage.getByRole('link', { name: /open album page/i });
    await expect(albumLink).toBeVisible({ timeout: 15_000 });
    const albumHref = await albumLink.getAttribute('href');
    expect(albumHref).toBeTruthy();
    const albumSlug = albumHref!.split('/album/')[1]?.split(/[?#]/)[0];
    expect(albumSlug).toBeTruthy();

    await loginTestUser(likerPage, secondUser.email, secondUser.password);
    await likerPage.goto(albumHref!);
    // Public album HTML is cached anonymously; wait until the logged-in like control hydrates.
    const likeButton = likerPage.getByTestId('album-like-button');
    await expect(likeButton).toBeVisible({ timeout: 15_000 });
    await expect(likerPage.getByPlaceholder(/write a comment/i)).toBeVisible({ timeout: 15_000 });
    await likeButton.click();
    await expect(likerPage.getByRole('button', { name: 'Unlike', exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(likerPage.getByTestId('album-like-count')).toHaveText('1', { timeout: 15_000 });

    // Likes are debounced (~2s) before they hit the API and revalidate the detail page.
    await expect.poll(async () => {
      const detail = await page.request.get(`/@${memberUser.nickname}/album/${albumSlug}`);
      expect(detail.ok()).toBeTruthy();
      const html = await detail.text();
      if (html.includes('data-testid="album-like-count">1')) return 'revalidated';
      // next dev bails out to CSR (next/dynamic), so the like count is not in the HTML.
      if (!process.env.CI && html.includes('BAILOUT_TO_CLIENT_SIDE_RENDERING')) return 'dev-csr';
      return 'pending';
    }, { timeout: 20_000 }).toMatch(process.env.CI ? /^revalidated$/ : /revalidated|dev-csr/);

    await ownerContext.close();
    await likerContext.close();
  });

  test('follow refreshes both profile pages', async ({ page, browser }) => {
    const actorContext = await browser.newContext();
    const actorPage = await actorContext.newPage();
    await loginTestUser(actorPage, secondUser.email, secondUser.password);

    const follow = await actorPage.request.post('/api/follows', {
      data: { profileId: memberUser.userId },
    });
    expect(follow.ok()).toBeTruthy();

    const targetProfile = await page.request.get(`/@${memberUser.nickname}`);
    expect(targetProfile.ok()).toBeTruthy();
    expect(await targetProfile.text()).toMatch(/1\s+follower/);

    const actorProfile = await page.request.get(`/@${secondUser.nickname}`);
    expect(actorProfile.ok()).toBeTruthy();
    expect(await actorProfile.text()).toMatch(/1\s+following/);

    await actorPage.request.delete(`/api/follows?profileId=${memberUser.userId}`);
    await actorContext.close();
  });
});
