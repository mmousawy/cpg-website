import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { isProfileComplete } from '@/utils/profileCompletion';
import {
  matchesPath,
  needsProxyAuthSession,
  needsProxyOwnProfile,
} from '@/utils/proxyAuth';
import { hasSupabaseAuthCookies } from '@/utils/supabase/authCookie';

// Public API routes skip session/profile checks in this proxy.
const publicApiPaths = [
  '/api/auth/',           // Auth endpoints (login, signup, reset)
  '/api/contact',         // Contact form
  '/api/health',          // Health check
  '/api/gallery/',        // Public gallery data
  '/api/events/past',     // Public events data
  '/api/search',          // Public search
  '/api/signup',          // Signup verification
  '/api/unsubscribe',     // Email unsubscribe
  '/api/views',           // View tracking (public)
  '/api/cron/',           // Cron jobs (use CRON_SECRET instead)
  '/api/revalidate-all',  // Revalidation (uses REVALIDATION_SECRET)
  '/api/revalidate-changelog',  // Changelog revalidation (uses REVALIDATION_SECRET)
  '/api/challenges/notify-result',     // Webhook-style endpoint (auth checked in route)
  '/api/challenges/notify-submission', // Webhook-style endpoint (auth checked in route)
];

const KNOWN_ROUTES = new Set([
  'account', 'account-deleted', 'actions', 'admin', 'api', 'auth', 'auth-callback', 'auth-error',
  'cancel', 'challenges', 'changelog', 'confirm', 'contact', 'email', 'events',
  'forgot-password', 'gallery', 'help', 'login', 'members', 'onboarding',
  'privacy', 'providers', 'reset-password', 'scene', 'signup', 'terms', 'unsubscribe',
  '_next',
]);

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Redirect bare nickname URLs to @-prefixed versions (e.g. /johndoe → /@johndoe)
  // Only redirect if the nickname actually exists in the database
  const firstSegment = pathname.split('/')[1];
  if (
    firstSegment &&
    !KNOWN_ROUTES.has(firstSegment) &&
    !firstSegment.startsWith('@') &&
    !firstSegment.startsWith('_next') &&
    !firstSegment.includes('.')
  ) {
    // Check if this is an actual profile nickname before redirecting
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?nickname=eq.${encodeURIComponent(firstSegment)}&select=nickname&limit=1`,
        {
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
          },
        },
      );

      if (res.ok) {
        const profiles = await res.json();
        if (profiles.length > 0) {
          const url = request.nextUrl.clone();
          const rest = pathname.slice(firstSegment.length + 1);
          url.pathname = `/@${firstSegment}${rest}`;
          return NextResponse.redirect(url, 301);
        }
      }
    } catch {
      // If the check fails, fall through and let Next.js handle the route
    }
  }

  const matchesRoute = (path: string) => matchesPath(pathname, path);

  // Skip auth check for public API routes
  const isPublicApiRoute = publicApiPaths.some(path => pathname.startsWith(path));
  if (isPublicApiRoute) {
    return NextResponse.next();
  }

  // Public pages (gallery, photos, albums, etc.) skip Auth + get_own_profile.
  // Those two calls were ~210k requests/day because this proxy also runs on
  // Next.js Link prefetches. Session refresh still happens on gated routes
  // and in the browser client for logged-in users.
  const isProtectedPath = ['/account', '/admin'].some((path) => matchesRoute(path));
  const isAuthPath = ['/login', '/signup'].some((path) => matchesRoute(path));
  const hasAuthCookie = hasSupabaseAuthCookies(request.cookies.getAll());

  if (!needsProxyAuthSession(pathname) || !hasAuthCookie) {
    if (isProtectedPath && !hasAuthCookie) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next();
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Verifies the JWT locally (asymmetric keys) and refreshes it when expired.
  // Do not remove this — Server Components cannot write refreshed auth cookies.
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const user = typeof claims?.sub === 'string'
    ? { id: claims.sub, email: typeof claims.email === 'string' ? claims.email : null }
    : null;

  let profile: {
    deletion_scheduled_at: string | null;
    suspended_at: string | null;
    email: string | null;
    full_name: string | null;
    nickname: string | null;
    terms_accepted_at: string | null;
  } | null = null;

  if (user && needsProxyOwnProfile(pathname)) {
    const { data } = await supabase.rpc('get_own_profile');
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const ownProfile = data as Record<string, unknown>;
      profile = {
        deletion_scheduled_at: (ownProfile.deletion_scheduled_at as string | null) ?? null,
        suspended_at: (ownProfile.suspended_at as string | null) ?? null,
        email: (ownProfile.email as string | null) ?? null,
        full_name: (ownProfile.full_name as string | null) ?? null,
        nickname: (ownProfile.nickname as string | null) ?? null,
        terms_accepted_at: (ownProfile.terms_accepted_at as string | null) ?? null,
      };
    }
  }

  // Block users whose account is scheduled for deletion
  if (user && profile?.deletion_scheduled_at && !matchesRoute('/account-deleted')) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = '/account-deleted';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Block suspended users from account/admin areas and write APIs
  const isSuspended = !!user && !!profile?.suspended_at;
  const suspendedAllowedPaths = ['/login', '/logout', '/contact', '/help', '/terms', '/privacy', '/account-deleted'];
  if (
    isSuspended
    && !suspendedAllowedPaths.some((path) => matchesRoute(path))
    && (matchesRoute('/account') || matchesRoute('/admin') || pathname.startsWith('/api/'))
  ) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('error', 'suspended');
    return NextResponse.redirect(url);
  }

  // Force profile completion on gated routes. Public pages skip this so
  // gallery/photo prefetches do not call get_own_profile.
  if (
    user
    && needsProxyOwnProfile(pathname)
    && !matchesRoute('/onboarding')
    && !matchesRoute('/auth-callback')
    && !matchesRoute('/api')
    && !matchesRoute('/account-deleted')
    && !isProfileComplete(profile, { fallbackEmail: user.email ?? null })
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/onboarding';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPath && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/account/events';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Run proxy on:
     * - /account/* (protected - user dashboard)
     * - /admin/* (protected - admin pages)
     * - /login, /signup (auth pages - redirect if already logged in)
     * - /auth-callback (OAuth callback)
     * - /onboarding (needs auth check)
     * - /api/* (API routes that may need auth)
     * - All other non-static paths (to redirect bare nicknames → /@nickname)
     *
     * Excluded: static assets, Next.js internals, and known static files
     */
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.json|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|txt|xml|json)$).*)',
  ],
};
