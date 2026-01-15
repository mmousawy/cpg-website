import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

const blacklist = process.env.BLACKLIST_IPS?.split(",") || [];

export default async function proxy(request: NextRequest) {
  const ipAddress = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for");

  // If IP address exists in blacklist, return 403
  if (blacklist.includes(ipAddress || "")) {
    return NextResponse.json({ message: "Blacklisted" }, { status: 403 });
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

  // Protected routes - redirect to login if not authenticated
  const protectedPaths = ['/account', '/admin'];
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Auth routes - redirect to dashboard if already authenticated
  const authPaths = ['/login', '/signup'];
  const isAuthPath = authPaths.some(path =>
    request.nextUrl.pathname.startsWith(path),
  );

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
     * Only run middleware on routes that need auth:
     * - /account/* (protected - user dashboard)
     * - /admin/* (protected - admin pages)
     * - /login, /signup (auth pages - redirect if already logged in)
     * - /auth-callback (OAuth callback)
     * - /onboarding (needs auth check)
     * - /api/* (API routes that may need auth)
     *
     * Public routes are EXCLUDED to allow full caching:
     * - / (homepage)
     * - /events/* (public event pages)
     * - /gallery (public gallery)
     * - /@* and /[nickname] (public profiles)
     * - Static assets
     */
    '/account/:path*',
    '/admin/:path*',
    '/login',
    '/signup',
    '/auth-callback',
    '/onboarding',
    '/api/:path*',
  ],
};
