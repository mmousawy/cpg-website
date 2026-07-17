import type { APIRequestContext, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const TEST_EMAILS_FILE = path.join(process.cwd(), 'test-results', 'test-emails.json');

export function getVercelBypassToken(explicit?: string): string | undefined {
  if (explicit) return explicit;
  if (process.env.VERCEL_BYPASS_TOKEN) return process.env.VERCEL_BYPASS_TOKEN;
  const baseUrlWithToken = process.env.BASE_URL;
  if (!baseUrlWithToken) return undefined;
  try {
    return new URL(baseUrlWithToken).searchParams.get('x-vercel-protection-bypass') || undefined;
  } catch {
    return undefined;
  }
}

export function withVercelBypassHeaders(
  headers: HeadersInit = {},
  bypassToken?: string,
): HeadersInit {
  const token = getVercelBypassToken(bypassToken);
  if (!token) return headers;
  return {
    ...headers,
    'x-vercel-protection-bypass': token,
    'x-vercel-set-bypass-cookie': 'true',
  };
}

export function withVercelBypassQuery(url: string, bypassToken?: string): string {
  const token = getVercelBypassToken(bypassToken);
  if (!token) return url;
  const parsed = new URL(url);
  parsed.searchParams.set('x-vercel-protection-bypass', token);
  return parsed.toString();
}

/** Shared Playwright request context options (mirrors playwright.config.ts). */
export function getPlaywrightApiContextOptions(): {
  baseURL: string;
  extraHTTPHeaders: Record<string, string>;
  } {
  const baseUrlWithToken = process.env.BASE_URL || 'http://localhost:3000';
  const [baseUrl] = baseUrlWithToken.split('?');
  const bypassHeaders = withVercelBypassHeaders({});

  return {
    baseURL: baseUrl,
    extraHTTPHeaders: bypassHeaders as Record<string, string>,
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

/**
 * Create a fully verified test user via the test setup API.
 * Uses Playwright's request context so Vercel bypass headers match browser tests.
 */
export async function createTestUser(apiRequest: APIRequestContext): Promise<TestUser> {
  const email = generateTestEmail();
  const password = 'TestPassword123!';
  const nickname = `test-${Date.now()}`;

  const maxAttempts = 8;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await apiRequest.post('/api/test/setup', {
      data: { email, password, nickname, fullName: 'Test User' },
    });

    const contentType = response.headers()['content-type'] ?? '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      const looksLikeProtectionPage = /vercel|authentication required|deployment protection|password/i.test(text);
      const reasonHint = looksLikeProtectionPage
        ? 'Likely Vercel deployment protection. Ensure VERCEL_BYPASS_TOKEN is set in CI.'
        : 'Server may not be ready yet.';
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
      throw new Error(`Failed to create test user: ${error.error || response.statusText()}`);
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
  await apiRequest.post('/api/test/cleanup', { data: { emails } });
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
