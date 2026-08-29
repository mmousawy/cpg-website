export function isSupabaseAuthCookieName(name: string): boolean {
  return name.startsWith('sb-') && name.includes('auth-token');
}

export function hasSupabaseAuthCookies(
  cookies: Iterable<{ name: string }>,
): boolean {
  for (const cookie of cookies) {
    if (isSupabaseAuthCookieName(cookie.name)) return true;
  }
  return false;
}
