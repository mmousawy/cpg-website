/** Hosted Supabase project ref before self-hosted cutover (see supabaseHosts.ts). */
const LEGACY_HOSTED_AUTH_COOKIE_PREFIX = 'sb-lpdjlhlslqtdswhnchmv-auth-token';

export function isSupabaseAuthCookieName(name: string): boolean {
  return name.startsWith('sb-') && name.includes('auth-token');
}

export function isLegacyHostedSupabaseAuthCookieName(name: string): boolean {
  return (
    name === LEGACY_HOSTED_AUTH_COOKIE_PREFIX
    || name.startsWith(`${LEGACY_HOSTED_AUTH_COOKIE_PREFIX}.`)
  );
}

export function hasSupabaseAuthCookies(
  cookies: Iterable<{ name: string }>,
): boolean {
  for (const cookie of cookies) {
    if (isSupabaseAuthCookieName(cookie.name)) return true;
  }
  return false;
}

/** Drop leftover hosted-project session chunks so they are not sent with self-hosted cookies. */
export function expireLegacyHostedSupabaseAuthCookies(
  cookies: Iterable<{ name: string }>,
  response: { cookies: { set: (name: string, value: string, options?: { path?: string; maxAge?: number }) => void } },
): void {
  for (const cookie of cookies) {
    if (isLegacyHostedSupabaseAuthCookieName(cookie.name)) {
      response.cookies.set(cookie.name, '', { path: '/', maxAge: 0 });
    }
  }
}
