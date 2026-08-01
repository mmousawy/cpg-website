/** Routes that always mount the full client auth + data provider stack. */
const AUTH_ROUTE_PREFIXES = [
  '/login',
  '/signup',
  '/onboarding',
  '/forgot-password',
  '/account',
  '/admin',
  '/email',
] as const;

export function isAuthRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return AUTH_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
