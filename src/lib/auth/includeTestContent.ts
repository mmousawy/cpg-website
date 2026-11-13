import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import type { NextRequest } from 'next/server';

import { safeEqualSecret } from '@/utils/security';

export const E2E_INCLUDE_TEST_HEADER = 'x-cpg-e2e-include-test';
/** Playwright sets this cookie so client-side fetch() includes test profiles in search. */
export const E2E_INCLUDE_TEST_COOKIE = 'cpg_e2e_include_test';

function getE2EIncludeTestSecret(): string | undefined {
  return process.env.INTERNAL_API_SECRET || process.env.CRON_SECRET || undefined;
}

/** True when the verified e2e header is present (Playwright smoke tests). */
export function isIncludeTestContentHeaderValue(headerValue: string | null | undefined): boolean {
  const secret = getE2EIncludeTestSecret();
  if (!secret || !headerValue) return false;
  return safeEqualSecret(headerValue, secret);
}

function readCookieHeaderValue(
  cookieHeader: string | null | undefined,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) === name) {
      return decodeURIComponent(trimmed.slice(eq + 1));
    }
  }
  return null;
}

function isIncludeTestContentFromCredentials(
  headerValue: string | null | undefined,
  cookieValue: string | null | undefined,
): boolean {
  return isIncludeTestContentHeaderValue(headerValue)
    || isIncludeTestContentHeaderValue(cookieValue);
}

/** Read the verified e2e header once per RSC request. */
export const getIncludeTestContent = cache(async (): Promise<boolean> => {
  const headerStore = await headers();
  if (isIncludeTestContentHeaderValue(headerStore.get(E2E_INCLUDE_TEST_HEADER))) {
    return true;
  }
  const cookieStore = await cookies();
  return isIncludeTestContentHeaderValue(cookieStore.get(E2E_INCLUDE_TEST_COOKIE)?.value);
});

/** Read the verified e2e header from a Route Handler request. */
export function getIncludeTestContentFromRequest(request: NextRequest | Request): boolean {
  return isIncludeTestContentFromCredentials(
    request.headers.get(E2E_INCLUDE_TEST_HEADER),
    readCookieHeaderValue(request.headers.get('cookie'), E2E_INCLUDE_TEST_COOKIE),
  );
}
