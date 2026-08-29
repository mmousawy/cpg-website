export function matchesPath(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

const PROXY_SESSION_PATHS = [
  '/account',
  '/admin',
  '/login',
  '/signup',
  '/onboarding',
  '/auth-callback',
  '/account-deleted',
  '/members',
  '/cancel',
  '/confirm',
  '/auth',
  '/api',
] as const;

const PROXY_PROFILE_PATHS = [
  '/account',
  '/admin',
  '/onboarding',
  '/account-deleted',
  '/api',
] as const;

/**
 * Routes that need a verified session in proxy: protected pages, auth
 * redirects, and server components/APIs that call getUser().
 * Public gallery/photo/album pages are excluded so Link prefetches
 * do not hit Auth + get_own_profile on every hover.
 */
export function needsProxyAuthSession(pathname: string): boolean {
  return PROXY_SESSION_PATHS.some((path) => matchesPath(pathname, path));
}

/**
 * Routes that need get_own_profile in proxy (onboarding, deletion,
 * and suspension gates). Login/signup and public pages only need
 * to know whether a session exists.
 */
export function needsProxyOwnProfile(pathname: string): boolean {
  return PROXY_PROFILE_PATHS.some((path) => matchesPath(pathname, path));
}
