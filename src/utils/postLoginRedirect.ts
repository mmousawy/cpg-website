import { safeInternalPath } from '@/utils/security';

const PUBLIC_LISTING_PAGES = ['/', '/events'];

/** Safe post-login destination (blocks open redirects). */
export function getPostLoginRedirect(
  redirectTo: string | null | undefined,
  fallback = '/account/events',
): string {
  const safe = safeInternalPath(redirectTo, fallback);

  if (PUBLIC_LISTING_PAGES.includes(safe)) {
    return fallback;
  }

  return safe;
}
