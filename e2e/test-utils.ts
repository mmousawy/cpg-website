import type { APIRequestContext, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const TEST_EMAILS_FILE = path.join(process.cwd(), 'test-results', 'test-emails.json');

const STAGING_HOST = 'staging.creativephotography.group';

/** True when E2E targets the Coolify staging site (admin-gated, no public signup). */
export function isStagingE2ETarget(): boolean {
  const baseUrl = process.env.BASE_URL ?? '';
  try {
    return new URL(baseUrl).hostname === STAGING_HOST;
  } catch {
    return baseUrl.includes(STAGING_HOST);
  }
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

/** Shared Playwright request context options (mirrors playwright.config.ts). */
export function getPlaywrightApiContextOptions(): {
  baseURL: string;
  extraHTTPHeaders: Record<string, string>;
  } {
  const baseUrlWithToken = process.env.BASE_URL || 'http://localhost:3000';
  const [baseUrl] = baseUrlWithToken.split('?');
  const headers = withE2EIncludeTestHeaders({});

  return {
    baseURL: baseUrl,
    extraHTTPHeaders: headers,
  };
}

// Generate unique test email
export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `test-e2e-${timestamp}-${random}@test.local`;
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

function resolveCreateTestUserOptions(options: CreateTestUserOptions): CreateTestUserOptions {
  if (isStagingE2ETarget() && options.asAdmin !== false) {
    return { ...options, asAdmin: true };
  }
  return options;
}

/**
 * Create a fully verified test user via the test setup API.
 * Uses Playwright's request context so auth headers match browser tests.
 */
export async function createTestUser(
  apiRequest: APIRequestContext,
  options: CreateTestUserOptions = {},
): Promise<TestUser> {
  const resolved = resolveCreateTestUserOptions(options);
  const email = generateTestEmail();
  const password = 'TestPassword123!';
  const nickname = `test-${Date.now()}`;
  const completeOnboarding = resolved.completeOnboarding !== false;
  const asAdmin = resolved.asAdmin === true;

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

/** Delete test users created during E2E runs. */
export async function cleanupTestUsers(
  apiRequest: APIRequestContext,
  emails: string[],
): Promise<void> {
  if (emails.length === 0) return;
  await apiRequest.post('/api/test/cleanup', {
    data: { emails },
    headers: withInternalApiHeaders(),
  });
}

/**
 * Log in a test user via the UI
 */
export async function loginTestUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');

  // Fill login form
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.fill(email);

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(password);

  // Submit
  const submitButton = page.locator('button[type="submit"]').or(
    page.getByRole('button', { name: /log in|sign in/i }),
  );
  await submitButton.click();

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
