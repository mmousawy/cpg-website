import type { NextRequest } from 'next/server';
import { afterEach, describe, expect, it } from 'vitest';

import { getConfiguredSiteUrl, getRequestSiteUrl } from '@/utils/requestSiteUrl';

function makeRequest(url: string, headers: Record<string, string> = {}): NextRequest {
  return new Request(url, { headers }) as NextRequest;
}

describe('requestSiteUrl', () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    }
  });

  it('prefers NEXT_PUBLIC_SITE_URL over request origin', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://creativephotography.group/';
    const request = makeRequest('http://0.0.0.0:3000/auth/verify-email?token=abc');

    expect(getRequestSiteUrl(request)).toBe('https://creativephotography.group');
    expect(getConfiguredSiteUrl()).toBe('https://creativephotography.group');
  });

  it('uses forwarded headers when site URL env is unset', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const request = makeRequest('http://0.0.0.0:3000/auth/verify-email?token=abc', {
      'x-forwarded-host': 'creativephotography.group',
      'x-forwarded-proto': 'https',
    });

    expect(getRequestSiteUrl(request)).toBe('https://creativephotography.group');
  });

  it('falls back to production default for local container origins', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const request = makeRequest('http://0.0.0.0:3000/auth/verify-email?token=abc');

    expect(getRequestSiteUrl(request)).toBe('https://creativephotography.group');
  });
});
