import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

const blacklist = process.env.BLACKLIST_IPS?.split(',') || [];

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
  '/api/challenges/notify-result',     // Webhook-style endpoint
  '/api/challenges/notify-submission', // Webhook-style endpoint
  '/api/test/',           // Test endpoints
  '/api/test-supabase',   // Test endpoint
];

const KNOWN_ROUTES = new Set([
  'account', 'actions', 'admin', 'api', 'auth', 'auth-callback', 'auth-error',
  'cancel', 'challenges', 'changelog', 'confirm', 'contact', 'email', 'events',
  'forgot-password', 'gallery', 'help', 'login', 'members', 'onboarding',
  'privacy', 'providers', 'reset-password', 'signup', 'terms', 'unsubscribe',
  '_next',
]);

export default async function proxy(request: NextRequest) {
  const ipAddress = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for');

  // If IP address exists in blacklist, return 403
  if (blacklist.includes(ipAddress || '')) {
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

  // Routes that need auth handling (Supabase getUser)
  const authHandledPaths = ['/account', '/admin', '/login', '/signup', '/auth-callback', '/onboarding', '/api/'];
  const needsAuthHandling = authHandledPaths.some(path => matchesRoute(path));

  // Skip auth check for all other routes (saves 160-250ms per request)
  if (!needsAuthHandling) {
    return NextResponse.next({ request });
  }

  // Skip auth check for public API routes
  const isPublicApiRoute = publicApiPaths.some(path => pathname.startsWith(path));
  if (isPublicApiRoute) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

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
          supabaseResponse = NextResponse.next({
            request,
          });
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

  // Block users whose account is scheduled for deletion
  // Sign them out and redirect to the deletion notice page
  if (user && !matchesRoute('/account-deleted')) {
    const profileRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=deletion_scheduled_at&limit=1`,
      {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
      },
    );

    if (profileRes.ok) {
      const profiles = await profileRes.json();
      if (profiles.length > 0 && profiles[0].deletion_scheduled_at) {
        await supabase.auth.signOut();
        const url = request.nextUrl.clone();
        url.pathname = '/account-deleted';
        url.search = '';
        return NextResponse.redirect(url);
      }
    }
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
