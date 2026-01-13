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
