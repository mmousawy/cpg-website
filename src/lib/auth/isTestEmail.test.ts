import { afterEach, describe, expect, it } from 'vitest';

import { isTestEmail, isTestNotificationEnvironment, shouldSkipNotificationsAndEmails } from './isTestEmail';

type EnvBag = {
  NODE_ENV?: string
  RESEND_API_KEY?: string
};

const env = process.env as EnvBag;

const ORIGINAL: EnvBag = {
  NODE_ENV: process.env.NODE_ENV,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
};

function setEnv({ NODE_ENV, RESEND_API_KEY }: EnvBag) {
  if (NODE_ENV === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = NODE_ENV;

  if (RESEND_API_KEY === undefined) delete env.RESEND_API_KEY;
  else env.RESEND_API_KEY = RESEND_API_KEY;
}

afterEach(() => {
  setEnv(ORIGINAL);
});

describe('isTestEmail', () => {
  it('matches e2e and unit-test addresses', () => {
    expect(isTestEmail('test-e2e-123@test.local')).toBe(true);
    expect(isTestEmail('user@test.local')).toBe(true);
    expect(isTestEmail('test-123@test.example.com')).toBe(true);
    expect(isTestEmail('test-signup-abc@example.com')).toBe(true);
    expect(isTestEmail('TEST-E2E-1@TEST.LOCAL')).toBe(true);
  });

  it('does not match real addresses', () => {
    expect(isTestEmail('member@creativephotography.group')).toBe(false);
    expect(isTestEmail('person@gmail.com')).toBe(false);
    expect(isTestEmail(null)).toBe(false);
    expect(isTestEmail(undefined)).toBe(false);
    expect(isTestEmail('')).toBe(false);
  });
});

describe('shouldSkipNotificationsAndEmails', () => {
  it('skips for test emails even in production', () => {
    setEnv({ NODE_ENV: 'production', RESEND_API_KEY: 're_live_abc' });
    expect(shouldSkipNotificationsAndEmails('test-e2e-1@test.local')).toBe(true);
    expect(shouldSkipNotificationsAndEmails('real@example.com')).toBe(false);
  });

  it('skips when NODE_ENV is test', () => {
    setEnv({ NODE_ENV: 'test', RESEND_API_KEY: 're_live_abc' });
    expect(isTestNotificationEnvironment()).toBe(true);
    expect(shouldSkipNotificationsAndEmails('real@example.com')).toBe(true);
  });

  it('skips when Resend is in test mode', () => {
    setEnv({ NODE_ENV: 'production', RESEND_API_KEY: 're_test_abc' });
    expect(isTestNotificationEnvironment()).toBe(true);
    expect(shouldSkipNotificationsAndEmails('real@example.com')).toBe(true);
  });
});
