import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import {
  getEmailSiteUrl,
  toAbsoluteEmailUrl,
} from '@/emails/utils/siteUrl';

describe('email site URL helpers', () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    }
  });

  it('falls back to the production domain when site URL is unset', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(getEmailSiteUrl()).toBe('https://creativephotography.group');
    expect(toAbsoluteEmailUrl('/events/photowalk-kralingse-plas')).toBe(
      'https://creativephotography.group/events/photowalk-kralingse-plas',
    );
  });

  it('normalizes configured site URLs without trailing slashes', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://creativephotography.group/';
    expect(getEmailSiteUrl()).toBe('https://creativephotography.group');
  });

  it('leaves absolute URLs unchanged', () => {
    expect(toAbsoluteEmailUrl('https://creativephotography.group/events/test')).toBe(
      'https://creativephotography.group/events/test',
    );
  });
});
