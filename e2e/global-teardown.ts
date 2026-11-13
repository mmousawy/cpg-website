import { request } from '@playwright/test';
import fs from 'fs';
import path from 'path';

import { getPlaywrightRequestContextOptions, withInternalApiHeaders } from './test-utils';

const TEST_EMAILS_FILE = path.join(process.cwd(), 'test-results', 'test-emails.json');

async function globalTeardown() {
  console.log('\n🧹 Running E2E test cleanup...');

  let testEmails: string[] = [];
  try {
    if (fs.existsSync(TEST_EMAILS_FILE)) {
      const data = fs.readFileSync(TEST_EMAILS_FILE, 'utf-8');
      testEmails = JSON.parse(data) as string[];
    }
  } catch {
    console.log('No test emails file found or invalid JSON');
  }

  if (testEmails.length > 0) {
    console.log(`Found ${testEmails.length} tracked test email(s) from this run`);
  } else {
    console.log('No tracked test emails file (still sweeping orphan test accounts)');
  }

  const apiRequest = await request.newContext(getPlaywrightRequestContextOptions());

  try {
    const response = await apiRequest.post('/api/test/cleanup', {
      data: {
        emails: testEmails,
        sweepOrphans: true,
      },
      headers: withInternalApiHeaders(),
    });

    if (response.ok()) {
      const result = await response.json() as {
        deleted?: string[];
        notFound?: string[];
        errors?: string[];
      };
      const deleted = result.deleted ?? [];
      const notFound = result.notFound ?? [];
      console.log(`✅ Deleted ${deleted.length} test user(s)`);
      if (notFound.length > 0) {
        console.log(`ℹ️ ${notFound.length} tracked email(s) had no remaining account`);
      }
      if (result.errors?.length) {
        console.log('⚠️ Some errors:', result.errors);
      }
    } else {
      const body = await response.text().catch(() => '');
      console.log('❌ Cleanup API returned error:', response.status(), body.slice(0, 200));
    }
  } catch (error) {
    console.log('❌ Failed to call cleanup API:', error);
  } finally {
    await apiRequest.dispose();
  }

  try {
    if (fs.existsSync(TEST_EMAILS_FILE)) {
      fs.unlinkSync(TEST_EMAILS_FILE);
    }
  } catch {
    // Ignore
  }
}

export default globalTeardown;
