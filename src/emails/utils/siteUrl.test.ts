import { afterEach, describe, expect, it } from 'vitest';

import {
  getEmailAssetsUrl,
  getEmailSiteUrl,
  toAbsoluteEmailUrl,
} from '@/emails/utils/siteUrl';

describe('email site URL helpers', () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const originalAssetsUrl = process.env.EMAIL_ASSETS_URL;

  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    }

    if (originalAssetsUrl === undefined) {
      delete process.env.EMAIL_ASSETS_URL;
    } else {
      process.env.EMAIL_ASSETS_URL = originalAssetsUrl;
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

  it('uses the production domain for email images unless EMAIL_ASSETS_URL is set', () => {
    delete process.env.EMAIL_ASSETS_URL;
    expect(getEmailAssetsUrl()).toBe('https://creativephotography.group');

    process.env.EMAIL_ASSETS_URL = 'https://staging.creativephotography.group/';
    expect(getEmailAssetsUrl()).toBe('https://staging.creativephotography.group');
  });

  it('leaves absolute URLs unchanged', () => {
    expect(toAbsoluteEmailUrl('https://creativephotography.group/events/test')).toBe(
      'https://creativephotography.group/events/test',
    );
  });
});
