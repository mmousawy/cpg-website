const REDIRECT_CACHE_TTL_MS = 60_000;

type RedirectCacheEntry = {
  resolvedNickname: string | null;
  expiresAt: number;
};

const redirectCache = new Map<string, RedirectCacheEntry>();

function getCachedRedirect(nickname: string): string | null | undefined {
  const entry = redirectCache.get(nickname);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    redirectCache.delete(nickname);
    return undefined;
  }
  return entry.resolvedNickname;
}

function setCachedRedirect(nickname: string, resolvedNickname: string | null): void {
  redirectCache.set(nickname, {
    resolvedNickname,
    expiresAt: Date.now() + REDIRECT_CACHE_TTL_MS,
  });
}

/**
 * Resolve an old nickname to the profile's current nickname via nickname_redirects.
 * Returns null when no active redirect exists.
 */
export async function resolveNicknameRedirect(nickname: string): Promise<string | null> {
  const cached = getCachedRedirect(nickname);
  if (cached !== undefined) {
    return cached;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return null;
  }

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/rpc/resolve_nickname_redirect`,
      {
        method: 'POST',
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_nickname: nickname }),
        next: { revalidate: 60 },
      },
    );

    if (!res.ok) {
      setCachedRedirect(nickname, null);
      return null;
    }

    const data = await res.json();
    const resolved = typeof data === 'string' && data.length > 0 ? data : null;
    setCachedRedirect(nickname, resolved);
    return resolved;
  } catch {
    return null;
  }
}

export async function profileNicknameExists(nickname: string): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return false;
  }

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/profiles?nickname=eq.${encodeURIComponent(nickname)}&select=nickname&limit=1`,
      {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
        },
        next: { revalidate: 60 },
      },
    );

    if (!res.ok) return false;
    const profiles = await res.json();
    return Array.isArray(profiles) && profiles.length > 0;
  } catch {
    return false;
  }
}

export function buildAtNicknamePath(nickname: string, restPath: string): string {
  const normalizedRest = restPath.startsWith('/') ? restPath : `/${restPath}`;
  return `/@${nickname}${normalizedRest === '/' ? '' : normalizedRest}`;
}
