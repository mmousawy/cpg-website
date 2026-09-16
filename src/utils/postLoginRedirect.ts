import { isProfileComplete, type ProfileCompletionFields } from '@/utils/profileCompletion';
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

/** Send incomplete profiles to onboarding, preserving the intended destination. */
export function getPostAuthRedirect(
  profile: ProfileCompletionFields | null | undefined,
  redirectTo: string | null | undefined,
  fallbackEmail?: string | null,
): string {
  const dest = getPostLoginRedirect(redirectTo);

  if (isProfileComplete(profile, { fallbackEmail })) {
    return dest;
  }

  return `/onboarding?redirectTo=${encodeURIComponent(dest)}`;
}
