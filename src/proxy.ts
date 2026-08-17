import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { isProfileComplete } from '@/utils/profileCompletion';
import { getClientIp } from '@/utils/security';

const blacklist = process.env.BLACKLIST_IPS?.split(',').map((ip) => ip.trim()).filter(Boolean) || [];

// Public API routes that don't need auth check
// This avoids the 160-250ms overhead of supabase.auth.getUser() for each request
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
  const ipAddress = getClientIp(
    request.headers.get('x-real-ip'),
    request.headers.get('x-forwarded-for'),
  );

  if (ipAddress && blacklist.includes(ipAddress)) {
    return NextResponse.json({ message: 'Blacklisted' }, { status: 403 });
  }

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

  // Match exact path or subpaths (e.g. '/account' matches '/account' and '/account/events' but not '/account-deleted')
  const matchesRoute = (path: string) => pathname === path || pathname.startsWith(path + '/');

  // Skip auth check for public API routes
  const isPublicApiRoute = publicApiPaths.some(path => pathname.startsWith(path));
  if (isPublicApiRoute) {
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

  // IMPORTANT: This refreshes the session and syncs cookies
  // Do not remove this - it ensures auth cookies are properly set
  const { data: { user } } = await supabase.auth.getUser();

  let profile: {
    deletion_scheduled_at: string | null;
    suspended_at: string | null;
    email: string | null;
    full_name: string | null;
    nickname: string | null;
    terms_accepted_at: string | null;
  } | null = null;

  if (user) {
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

  // Once logged in, force profile completion before browsing any page.
  // Exempt onboarding/auth-callback/api/account-deleted routes to avoid redirect loops.
  if (
    user
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

  // Protected routes - redirect to login if not authenticated
  const protectedPaths = ['/account', '/admin'];
  const isProtectedPath = protectedPaths.some(path => matchesRoute(path));

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // Auth routes - redirect to dashboard if already authenticated
  const authPaths = ['/login', '/signup'];
  const isAuthPath = authPaths.some(path => matchesRoute(path));

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
