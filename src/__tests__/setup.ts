import '@testing-library/jest-dom';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env files (in order of priority)
config({ path: resolve(process.cwd(), '.env.local') }); // .env.local takes precedence
config({ path: resolve(process.cwd(), '.env') }); // Then .env

// Set up environment variables for tests if not already set
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';
}

if (!process.env.NEXT_PUBLIC_SITE_URL) {
  process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
}

// Set email env vars if not present (for tests)
if (!process.env.RESEND_API_KEY) {
  process.env.RESEND_API_KEY = 're_test_key';
}
if (!process.env.EMAIL_FROM_NAME) {
  process.env.EMAIL_FROM_NAME = 'Test';
}
if (!process.env.EMAIL_FROM_ADDRESS) {
  process.env.EMAIL_FROM_ADDRESS = 'test@example.com';
}
if (!process.env.EMAIL_REPLY_TO_NAME) {
  process.env.EMAIL_REPLY_TO_NAME = 'Test';
}
if (!process.env.EMAIL_REPLY_TO_ADDRESS) {
  process.env.EMAIL_REPLY_TO_ADDRESS = 'test@example.com';
}

// Global cleanup can be added in individual test files using afterEach
