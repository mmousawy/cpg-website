import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import fs from 'fs';
import path from 'path';

loadEnv({ path: path.join(process.cwd(), '.env.local'), quiet: true });

const TEST_EMAILS_FILE = path.join(process.cwd(), 'test-results', 'test-emails.json');

const STAGING_HOST = 'staging.creativephotography.group';
const STAGING_SITE_URL = `https://${STAGING_HOST}`;

/** True when Playwright should talk to the Coolify staging site. */
export function isStagingE2ETarget(): boolean {
  const baseUrl = resolveE2EBaseUrl();
  try {
    return new URL(baseUrl).hostname === STAGING_HOST;
  } catch {
    return baseUrl.includes(STAGING_HOST);
  }
}

function isLocalEnvPointedAtStagingSupabase(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return supabaseUrl.includes('db-staging.creativephotography.group');
}

function resolveE2EBaseUrl(): string {
  const configured = process.env.BASE_URL?.trim();
  if (configured) return configured.split('?')[0];
  // Local .env.local can point at staging Auth without staging JWT keys.
  // Hit the Coolify app, which already has the matching keys.
  if (isLocalEnvPointedAtStagingSupabase()) return STAGING_SITE_URL;
  return 'http://localhost:3000';
}

/** Same secret the app uses in verifyInternalApiRequest (INTERNAL_API_SECRET → CRON_SECRET). */
export function getInternalApiSecret(): string | undefined {
  return process.env.INTERNAL_API_SECRET || process.env.CRON_SECRET || undefined;
}

/** Headers for /api/test/* — internal API bearer. */
export function withInternalApiHeaders(
  headers: Record<string, string> = {},
): Record<string, string> {
  const secret = getInternalApiSecret();
  if (!secret) return headers;
  return {
    ...headers,
    Authorization: `Bearer ${secret}`,
  };
}

/** Same header Playwright sends so e2e users appear on public pages. */
export const E2E_INCLUDE_TEST_HEADER = 'x-cpg-e2e-include-test';
/** Cookie name — must match `E2E_INCLUDE_TEST_COOKIE` in includeTestContent.ts */
export const E2E_INCLUDE_TEST_COOKIE = 'cpg_e2e_include_test';

export type PlaywrightCookie = {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  sameSite: 'Lax' | 'Strict' | 'None';
  httpOnly: boolean;
  expires: number;
};

/** Cookies for browser fetch() and navigations (mirrors verified E2E header). */
export function getE2EPlaywrightCookies(baseURL: string): PlaywrightCookie[] {
  const secret = getInternalApiSecret();
  if (!secret) return [];

  const url = new URL(baseURL);
  return [{
    name: E2E_INCLUDE_TEST_COOKIE,
    value: secret,
    domain: url.hostname,
    path: '/',
    secure: url.protocol === 'https:',
    sameSite: 'Lax',
    httpOnly: true,
    expires: Math.floor(Date.now() / 1000) + 60 * 60,
  }];
}

/** APIRequestContext options — omit browser-only storageState cookies. */
export function getPlaywrightRequestContextOptions(): {
  baseURL: string;
  extraHTTPHeaders: Record<string, string>;
  } {
  const { baseURL, extraHTTPHeaders } = getPlaywrightApiContextOptions();
  return { baseURL, extraHTTPHeaders };
}

export function withE2EIncludeTestHeaders(
  headers: Record<string, string> = {},
): Record<string, string> {
  const secret = getInternalApiSecret();
  if (!secret) return headers;
  return {
    ...headers,
    [E2E_INCLUDE_TEST_HEADER]: secret,
  };
}

export type PlaywrightApiContextOptions = {
  baseURL: string;
  extraHTTPHeaders: Record<string, string>;
  e2eCookies: PlaywrightCookie[];
};

/** Shared Playwright request context options (mirrors playwright.config.ts). */
export function getPlaywrightApiContextOptions(): PlaywrightApiContextOptions {
  const baseURL = resolveE2EBaseUrl();
  const extraHTTPHeaders = withE2EIncludeTestHeaders({});

  return {
    baseURL,
    extraHTTPHeaders,
    e2eCookies: getE2EPlaywrightCookies(baseURL),
  };
}

// Generate unique test email
export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `test-e2e-${timestamp}-${random}@test.local`;
}

export function untrackTestEmail(email: string): void {
  try {
    if (!fs.existsSync(TEST_EMAILS_FILE)) return;
    const data = fs.readFileSync(TEST_EMAILS_FILE, 'utf-8');
    const emails: string[] = JSON.parse(data);
    const next = emails.filter((e) => e.toLowerCase() !== email.toLowerCase());
    if (next.length === emails.length) return;
    if (next.length === 0) {
      fs.unlinkSync(TEST_EMAILS_FILE);
    } else {
      fs.writeFileSync(TEST_EMAILS_FILE, JSON.stringify(next, null, 2));
    }
  } catch (error) {
    console.error('Failed to untrack test email:', error);
  }
}

// Track email for cleanup
export function trackTestEmail(email: string): void {
  try {
    // Ensure directory exists
    const dir = path.dirname(TEST_EMAILS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Read existing emails
    let emails: string[] = [];
    if (fs.existsSync(TEST_EMAILS_FILE)) {
      const data = fs.readFileSync(TEST_EMAILS_FILE, 'utf-8');
      emails = JSON.parse(data);
    }

    // Add new email if not already tracked
    if (!emails.includes(email)) {
      emails.push(email);
      fs.writeFileSync(TEST_EMAILS_FILE, JSON.stringify(emails, null, 2));
    }
  } catch (error) {
    console.error('Failed to track test email:', error);
  }
}

export async function createSignupBypassPath(
  apiRequest: APIRequestContext,
): Promise<string> {
  if (!getInternalApiSecret()) {
    throw new Error(
      'INTERNAL_API_SECRET or CRON_SECRET must be set to mint a staging signup invite.',
    );
  }

  const response = await apiRequest.post('/api/test/signup-bypass', {
    headers: withInternalApiHeaders(),
  });

  if (!response.ok()) {
    throw new Error(
      `Failed to create signup bypass: HTTP ${response.status()} ${await response.text()}`,
    );
  }

  const data = await response.json() as { bypassToken?: string };
  if (!data.bypassToken) {
    throw new Error('Signup bypass response missing bypassToken');
  }

  return `/signup?bypass=${data.bypassToken}`;
}

/** Public `/signup` locally; staging requires a one-time invite query param. */
export async function getSignupPagePath(
  apiRequest: APIRequestContext,
): Promise<string> {
  if (!isStagingE2ETarget()) return '/signup';
  return createSignupBypassPath(apiRequest);
}

export interface TestUser {
  email: string;
  password: string;
  nickname: string;
  userId: string;
}

export type CreateTestUserOptions = {
  /** When false, the profile is left incomplete so login lands on onboarding. */
  completeOnboarding?: boolean;
  /** When true, the profile is created with is_admin = true. */
  asAdmin?: boolean;
};

/**
 * Create a fully verified test user via the test setup API.
 * Uses Playwright's request context so auth headers match browser tests.
 * Pass `{ asAdmin: true }` only when the spec needs an admin (event create auto-RSVPs every admin).
 */
export async function createTestUser(
  apiRequest: APIRequestContext,
  options: CreateTestUserOptions = {},
): Promise<TestUser> {
  const email = generateTestEmail();
  const password = 'TestPassword123!';
  const nickname = `test-${Date.now()}`;
  const completeOnboarding = options.completeOnboarding !== false;
  const asAdmin = options.asAdmin === true;

  if (!getInternalApiSecret()) {
    throw new Error(
      'INTERNAL_API_SECRET or CRON_SECRET must be set to call /api/test/setup (matches the deployed app).',
    );
  }

  const maxAttempts = 8;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await apiRequest.post('/api/test/setup', {
      data: { email, password, nickname, fullName: 'Test User', completeOnboarding, asAdmin },
      headers: withInternalApiHeaders(),
    });

    const contentType = response.headers()['content-type'] ?? '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      const reasonHint = 'Server may not be ready yet or /api/test is blocked on the target.';
      const msg = `Attempt ${attempt}/${maxAttempts}: Expected JSON from /api/test/setup but got "${contentType}" (HTTP ${response.status()}). ${reasonHint}`;
      console.warn(msg, '\nResponse preview:', text.slice(0, 200));
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, Math.min(10000, attempt * 1500)));
        continue;
      }
      throw new Error(msg);
    }

    if (!response.ok()) {
      const error = await response.json();
      const hint = response.status() === 401
        ? ' Check that INTERNAL_API_SECRET/CRON_SECRET in CI matches the staging app env.'
        : '';
      throw new Error(`Failed to create test user: ${error.error || response.statusText()}${hint}`);
    }

    const data = await response.json();

    // Track for cleanup
    trackTestEmail(email);

    return {
      email,
      password: data.password || password,
      nickname: data.nickname || nickname,
      userId: data.userId,
    };
  }

  throw new Error('createTestUser: exhausted all retries');
}

type CleanupApiResult = {
  deleted?: string[];
  notFound?: string[];
  errors?: string[];
};

/** Delete test users created during E2E runs (also sweeps other orphan test accounts). */
export async function cleanupTestUsers(
  apiRequest: APIRequestContext,
  emails: string[],
  options?: { sweepOrphans?: boolean },
): Promise<CleanupApiResult | undefined> {
  const sweepOrphans = options?.sweepOrphans ?? false;
  if (emails.length === 0 && !sweepOrphans) return;

  const response = await apiRequest.post('/api/test/cleanup', {
    data: { emails, sweepOrphans },
    headers: withInternalApiHeaders(),
  });

  if (!response.ok()) return undefined;

  const result = (await response.json()) as CleanupApiResult;
  for (const deletedEmail of result.deleted ?? []) {
    untrackTestEmail(deletedEmail);
  }
  return result;
}

/**
 * Header Upload control. The manage chrome can mount that control more than once,
 * so strict mode must not require a single match.
 */
export function photosUploadInput(page: Page) {
  return page.locator('#photos-tour-upload + input[type="file"]').first();
}

/** Account photos grid is ready (loaded; empty state or at least one card). */
export async function waitForPhotoLibrary(page: Page) {
  const cards = page.locator('[data-testid="photo-card"]');
  const empty = page.getByText(/don't have any photos yet/i);
  await page.waitForURL(/\/account\/photos/, { timeout: 15_000 });
  await expect(page.getByLabel('Loading photos')).toHaveCount(0, { timeout: 20_000 });
  await expect(empty.or(cards.first())).toBeVisible({ timeout: 20_000 });
  return cards;
}

/** Upload one file via the library chrome and wait until a new photo card appears. */
export async function uploadPhotoInLibrary(page: Page, imagePath: string) {
  const cards = page.locator('[data-testid="photo-card"]');
  const countBefore = await cards.count();

  const uploadResponse = page.waitForResponse(
    (res) => res.url().includes('/api/photos/upload') && res.request().method() === 'POST',
    { timeout: 90_000 },
  );
  await photosUploadInput(page).setInputFiles(imagePath);
  const response = await uploadResponse;
  expect(response.ok(), `upload failed: ${response.status()} ${await response.text()}`).toBeTruthy();

  await expect(cards).toHaveCount(countBefore + 1, { timeout: 30_000 });
  return cards.first();
}

export async function waitForTagPeopleModal(page: Page) {
  const tagDialog = page.locator('dialog[open]').filter({
    has: page.getByRole('heading', { name: 'Tag people' }),
  });
  await expect(tagDialog.getByRole('heading', { name: 'Tag people' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(tagDialog.getByRole('button', { name: 'Save' })).toBeVisible();
  return tagDialog;
}

/**
 * Type in the portaled tag picker like a user (click + focus + keys), not Playwright fill().
 * Fails when modal focus traps block the picker without `data-portal-overlay`.
 */
export async function searchMemberInTagPicker(page: Page, nickname: string): Promise<void> {
  const picker = page.locator('[data-portal-overlay]').filter({
    has: page.locator('[data-tag-picker-input]'),
  });
  await expect(picker).toBeVisible({ timeout: 15_000 });

  const searchInput = picker.locator('[data-tag-picker-input]');
  await searchInput.click();
  await expect(searchInput).toBeFocused({ timeout: 5_000 });
  await searchInput.pressSequentially(nickname, { delay: 25 });

  await picker.getByRole('button', { name: new RegExp(`@${nickname}`) }).click({
    timeout: 10_000,
  });
}

/**
 * Public tag dots idle-hide with `scale(0)` (empty bounding box).
 * Wait until the button exists, then hover the photo stage so it scales in.
 */
export async function expectVisiblePhotoMemberTag(
  page: Page,
  nickname: string,
): Promise<void> {
  const tagDot = page.getByRole('button', { name: `Tagged ${nickname}` });
  await expect(tagDot).toBeAttached({ timeout: 15_000 });
  await page.locator('#gallery').hover();
  await expect(tagDot).toBeVisible({ timeout: 5_000 });
}

/** First-run driver.js overlay blocks clicks on the photo grid until it is closed. */
export async function dismissDriverTour(page: Page): Promise<void> {
  const close = page.locator('.driver-popover-close-btn');
  try {
    await close.first().waitFor({ state: 'visible', timeout: 4000 });
  } catch {
    return;
  }
  await close.first().click();
  await expect(page.locator('body')).not.toHaveClass(/driver-active/, { timeout: 5000 });
}

/**
 * Log in a test user via the UI
 */
export async function loginTestUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');

  const emailInput = page.getByLabel('Email', { exact: true });
  const passwordInput = page.getByLabel('Password', { exact: true });
  await expect(emailInput).toBeVisible({ timeout: 15_000 });
  await emailInput.fill(email);
  await passwordInput.fill(password);
  await expect(emailInput).toHaveValue(email);

  // Exact name avoids the mobile tab-bar "Log in or sign up" control.
  await page.getByRole('button', { name: 'Log in', exact: true }).click();

  // Wait for redirect to the authenticated area, including onboarding if the profile is incomplete.
  await page.waitForURL(/\/(account|onboarding|$)/, { timeout: 15000 });
}

export type TestEvent = {
  id: number;
  slug: string;
  title: string;
};

/** Create a published event via the admin API (requires an authenticated admin request context). */
export async function createTestEventAsAdmin(
  adminRequest: APIRequestContext,
  options: {
    title: string;
    date?: string;
    description?: string;
  },
): Promise<TestEvent> {
  const response = await adminRequest.post('/api/admin/events', {
    data: {
      title: options.title,
      date: options.date ?? '2030-06-01',
      description: options.description ?? 'Revalidation smoke test event',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create test event: ${await response.text()}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
  };
}

/** Delete a test event via the admin API (best-effort cleanup). */
export async function deleteTestEvent(
  adminRequest: APIRequestContext,
  event: Pick<TestEvent, 'id' | 'slug'>,
): Promise<void> {
  await adminRequest.fetch('/api/admin/events', {
    method: 'DELETE',
    data: { id: event.id, slug: event.slug },
  });
}
