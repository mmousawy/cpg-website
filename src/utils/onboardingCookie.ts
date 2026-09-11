import { NextResponse } from 'next/server';

import { matchesPath } from '@/utils/proxyAuth';

export const ONBOARDING_COOKIE_NAME = 'cpg_onboarding';
export const ONBOARDING_COOKIE_PENDING = 'pending';
export const ONBOARDING_COOKIE_COMPLETE = 'complete';

export type OnboardingCookieValue =
  | typeof ONBOARDING_COOKIE_PENDING
  | typeof ONBOARDING_COOKIE_COMPLETE;

/** Align with a typical Supabase session lifetime. */
export const ONBOARDING_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const ONBOARDING_GATE_EXEMPT_PATHS = [
  '/onboarding',
  '/auth-callback',
  '/api',
  '/account-deleted',
  '/login',
  '/logout',
  '/help',
  '/terms',
  '/privacy',
] as const;

export function getOnboardingCookieOptions(): {
  httpOnly: true;
  path: '/';
  sameSite: 'lax';
  secure: boolean;
  maxAge: number;
} {
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ONBOARDING_COOKIE_MAX_AGE_SECONDS,
  };
}

export function parseOnboardingCookie(
  value: string | undefined | null,
): OnboardingCookieValue | null {
  if (value === ONBOARDING_COOKIE_PENDING || value === ONBOARDING_COOKIE_COMPLETE) {
    return value;
  }
  return null;
}

export function isOnboardingGateExemptPath(pathname: string): boolean {
  return ONBOARDING_GATE_EXEMPT_PATHS.some((path) => matchesPath(pathname, path));
}

export function isPrefetchRequest(headers: Headers): boolean {
  if (headers.get('Next-Router-Prefetch') === '1') {
    return true;
  }

  const purpose = headers.get('Purpose') || headers.get('Sec-Purpose');
  return purpose === 'prefetch';
}

export function isDocumentNavigation(headers: Headers): boolean {
  if (isPrefetchRequest(headers)) {
    return false;
  }

  return headers.get('Sec-Fetch-Dest') === 'document';
}

export function shouldRedirectPendingOnboarding({
  pathname,
  hasAuthCookie,
  cookie,
}: {
  pathname: string;
  hasAuthCookie: boolean;
  cookie: OnboardingCookieValue | null;
}): boolean {
  return hasAuthCookie
    && cookie === ONBOARDING_COOKIE_PENDING
    && !isOnboardingGateExemptPath(pathname);
}

export function shouldClassifyOnboarding({
  pathname,
  hasAuthCookie,
  cookie,
  isDocument,
}: {
  pathname: string;
  hasAuthCookie: boolean;
  cookie: OnboardingCookieValue | null;
  isDocument: boolean;
}): boolean {
  return hasAuthCookie
    && cookie === null
    && isDocument
    && !isOnboardingGateExemptPath(pathname);
}

export function applyOnboardingCookie(
  response: NextResponse,
  value: OnboardingCookieValue,
): void {
  response.cookies.set(ONBOARDING_COOKIE_NAME, value, getOnboardingCookieOptions());
}

export function clearOnboardingCookie(response: NextResponse): void {
  response.cookies.set(ONBOARDING_COOKIE_NAME, '', {
    ...getOnboardingCookieOptions(),
    maxAge: 0,
  });
}
