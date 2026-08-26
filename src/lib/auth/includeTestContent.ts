import { cache } from 'react';
import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';

import { safeEqualSecret } from '@/utils/security';

export const E2E_INCLUDE_TEST_HEADER = 'x-cpg-e2e-include-test';

function getE2EIncludeTestSecret(): string | undefined {
  return process.env.INTERNAL_API_SECRET || process.env.CRON_SECRET || undefined;
}

/** True when the verified e2e header is present (Playwright smoke tests). */
export function isIncludeTestContentHeaderValue(headerValue: string | null | undefined): boolean {
  const secret = getE2EIncludeTestSecret();
  if (!secret || !headerValue) return false;
  return safeEqualSecret(headerValue, secret);
}

/** Read the verified e2e header once per RSC request. */
export const getIncludeTestContent = cache(async (): Promise<boolean> => {
  const headerStore = await headers();
  return isIncludeTestContentHeaderValue(headerStore.get(E2E_INCLUDE_TEST_HEADER));
});

/** Read the verified e2e header from a Route Handler request. */
export function getIncludeTestContentFromRequest(request: NextRequest | Request): boolean {
  return isIncludeTestContentHeaderValue(request.headers.get(E2E_INCLUDE_TEST_HEADER));
}
