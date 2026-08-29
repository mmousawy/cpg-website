import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/database.types';
import { isSupabaseAuthCookieName } from '@/utils/supabase/authCookie';

type BrowserSupabase = SupabaseClient<Database>;

let browserClientPromise: Promise<BrowserSupabase> | null = null;

export function hasSupabaseAuthCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((part) => {
    const name = part.trim().split('=')[0];
    return isSupabaseAuthCookieName(name);
  });
}

export function isAuthPath(pathname: string): boolean {
  return (
    pathname === '/login'
    || pathname === '/signup'
    || pathname.startsWith('/forgot-password')
    || pathname.startsWith('/reset-password')
  );
}

export function shouldLoadBrowserSupabase(
  pathname: string = typeof window === 'undefined' ? '' : window.location.pathname,
): boolean {
  return hasSupabaseAuthCookie() || isAuthPath(pathname);
}

/** Loads `@supabase/ssr` on demand so guest page loads skip the client SDK. */
export function loadBrowserSupabase(): Promise<BrowserSupabase> {
  if (!browserClientPromise) {
    browserClientPromise = import('@/utils/supabase/client').then((mod) => mod.supabase);
  }
  return browserClientPromise;
}
