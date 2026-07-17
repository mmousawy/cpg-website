import fs from 'fs';
import path from 'path';

import { withVercelBypassHeaders, withVercelBypassQuery } from './test-utils';

const TEST_EMAILS_FILE = path.join(process.cwd(), 'test-results', 'test-emails.json');

async function globalTeardown() {
  console.log('\n🧹 Running E2E test cleanup...');

  // Read test emails from file
  let testEmails: string[] = [];
  try {
    if (fs.existsSync(TEST_EMAILS_FILE)) {
      const data = fs.readFileSync(TEST_EMAILS_FILE, 'utf-8');
      testEmails = JSON.parse(data);
    }
  } catch {
    console.log('No test emails file found or invalid JSON');
    return;
  }

  if (testEmails.length === 0) {
    console.log('No test emails to clean up');
    return;
  }

  console.log(`Found ${testEmails.length} test emails to clean up`);

  try {
    // Use BASE_URL if available (for Vercel previews), otherwise fallback to localhost
    let baseUrl = process.env.BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    // Remove query parameters from baseURL for cleanup API call
    baseUrl = baseUrl.split('?')[0];

    const headers = withVercelBypassHeaders({ 'Content-Type': 'application/json' });

    const response = await fetch(withVercelBypassQuery(`${baseUrl}/api/test/cleanup`), {
      method: 'POST',
      headers,
      body: JSON.stringify({ emails: testEmails }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Cleaned up ${result.deleted?.length || 0} test users`);
      if (result.errors?.length > 0) {
        console.log('⚠️ Some errors:', result.errors);
      }
    } else {
      console.log('❌ Cleanup API returned error:', response.status);
    }
  } catch (error) {
    console.log('❌ Failed to call cleanup API:', error);
  }

  // Clean up the file
  try {
    if (fs.existsSync(TEST_EMAILS_FILE)) {
      fs.unlinkSync(TEST_EMAILS_FILE);
    }
  } catch {
    // Ignore
  }
}

export default globalTeardown;
