/** Hosted Supabase project ref before self-hosted cutover (see supabaseHosts.ts). */
const LEGACY_HOSTED_AUTH_COOKIE_PREFIX = 'sb-lpdjlhlslqtdswhnchmv-auth-token';
const AUTH_COOKIE_CHUNK_SUFFIX = /^(.*)\.(0|[1-9][0-9]*)$/;
const BASE64_COOKIE_PREFIX = 'base64-';

/**
 * auth-js refreshes the session this long before the access token expires
 * (3 ticks × 30s). Callers that cannot persist rotated cookies must stay
 * outside that window.
 */
export const STORED_SESSION_REFRESH_MARGIN_MS = 2 * 60 * 1000;

export type StoredAuthSession = {
  userId: string;
  /** Unix seconds, from the session cookie. */
  expiresAt: number;
};

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

export function isStoredAuthSessionFresh(
  expiresAt: number,
  now = Date.now(),
): boolean {
  return expiresAt * 1000 - now > STORED_SESSION_REFRESH_MARGIN_MS;
}

/**
 * Read the session already stored in auth cookies. Does not contact Auth and
 * does not rotate the refresh token.
 */
export function readStoredAuthSession(
  cookies: Iterable<{ name: string; value: string }>,
): StoredAuthSession | null {
  const list = [...cookies];
  const bases = new Set<string>();
  for (const cookie of list) {
    const base = currentAuthCookieBase(cookie.name);
    if (base) bases.add(base);
  }

  let best: StoredAuthSession | null = null;
  for (const base of bases) {
    const raw = combineAuthCookie(list, base);
    const session = raw ? parseStoredAuthSession(raw) : null;
    if (!session) continue;
    if (!best || session.expiresAt > best.expiresAt) best = session;
  }
  return best;
}

function currentAuthCookieBase(name: string): string | null {
  if (!isSupabaseAuthCookieName(name) || isLegacyHostedSupabaseAuthCookieName(name)) {
    return null;
  }
  const match = name.match(AUTH_COOKIE_CHUNK_SUFFIX);
  const base = match?.[1] ?? name;
  if (!isSupabaseAuthCookieName(base) || isLegacyHostedSupabaseAuthCookieName(base)) {
    return null;
  }
  return base;
}

function combineAuthCookie(
  cookies: { name: string; value: string }[],
  base: string,
): string | null {
  const byName = new Map(cookies.map((cookie) => [cookie.name, cookie.value]));
  const direct = byName.get(base);
  const combined = direct && direct.length > 0
    ? direct
    : collectChunks(byName, base);
  if (!combined) return null;
  return decodeAuthCookiePayload(combined);
}

function collectChunks(
  byName: Map<string, string>,
  base: string,
): string | null {
  const chunks: string[] = [];
  for (let index = 0; ; index += 1) {
    const chunk = byName.get(`${base}.${index}`);
    if (!chunk) break;
    chunks.push(chunk);
  }
  return chunks.length > 0 ? chunks.join('') : null;
}

function decodeAuthCookiePayload(value: string): string | null {
  if (!value.startsWith(BASE64_COOKIE_PREFIX)) return value;
  try {
    const decoded = Buffer.from(value.slice(BASE64_COOKIE_PREFIX.length), 'base64url').toString('utf8');
    JSON.parse(decoded);
    return decoded;
  } catch {
    return null;
  }
}

function parseStoredAuthSession(raw: string): StoredAuthSession | null {
  try {
    const parsed = JSON.parse(raw) as {
      expires_at?: unknown;
      access_token?: unknown;
      user?: { id?: unknown };
    };
    if (typeof parsed.expires_at !== 'number') return null;
    const userId = typeof parsed.user?.id === 'string'
      ? parsed.user.id
      : typeof parsed.access_token === 'string'
        ? userIdFromAccessToken(parsed.access_token)
        : null;
    if (!userId) return null;
    return { userId, expiresAt: parsed.expires_at };
  } catch {
    return null;
  }
}

function userIdFromAccessToken(accessToken: string): string | null {
  const payload = accessToken.split('.')[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub?: unknown };
    return typeof claims.sub === 'string' ? claims.sub : null;
  } catch {
    return null;
  }
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
