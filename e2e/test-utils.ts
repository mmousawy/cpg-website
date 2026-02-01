import type { Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const TEST_EMAILS_FILE = path.join(process.cwd(), 'test-results', 'test-emails.json');

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
 * Create a fully verified test user via the test setup API
 */
export async function createTestUser(baseUrl: string, bypassToken?: string): Promise<TestUser> {
  const email = generateTestEmail();
  const password = 'TestPassword123!';
  const nickname = `test-${Date.now()}`;

  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (bypassToken) {
    headers['x-vercel-protection-bypass'] = bypassToken;
  }

  const response = await fetch(`${baseUrl}/api/test/setup`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password, nickname, fullName: 'Test User' }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create test user: ${error.error || response.statusText}`);
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

  // Wait for redirect to account page or home
  await page.waitForURL(/\/(account|$)/, { timeout: 15000 });
}
