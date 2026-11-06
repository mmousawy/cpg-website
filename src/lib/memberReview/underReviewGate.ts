import { matchesPath } from '@/utils/proxyAuth';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const UNDER_REVIEW_ALLOWED_WRITE_APIS = [
  '/api/auth',
  '/api/contact',
  '/api/views',
  '/api/unsubscribe',
  '/api/notifications',
  '/api/onboarding/revalidate',
  '/api/feedback',
] as const;

export function isOwnPublicProfilePath(
  pathname: string,
  nickname: string | null | undefined,
): boolean {
  if (!nickname) return false;
  const prefix = `/@${nickname}`;
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Account settings, account APIs, and the member's public profile. */
export function isUnderReviewRestrictedPath(
  pathname: string,
  nickname?: string | null,
): boolean {
  if (matchesPath(pathname, '/account')) return true;
  if (matchesPath(pathname, '/api/account')) return true;
  return isOwnPublicProfilePath(pathname, nickname);
}

export function isUnderReviewWriteBlocked(pathname: string, method: string): boolean {
  if (!WRITE_METHODS.has(method.toUpperCase())) return false;
  if (!pathname.startsWith('/api/')) return false;
  return !UNDER_REVIEW_ALLOWED_WRITE_APIS.some((path) => matchesPath(pathname, path));
}

export const UNDER_REVIEW_INTERACTION_HINT = 'Unavailable while your account is under review';
