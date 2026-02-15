'use client';

import clsx from 'clsx';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { signOutAction } from '@/app/actions/auth';
import { routes } from '@/config/routes';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { useMounted } from '@/hooks/useMounted';
import { updateThemePreference } from '@/utils/updateTheme';
import Avatar from '../auth/Avatar';

export default function UserMenu() {
  const { user, profile, isLoading, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  // Helper to check if a route is active
  // exact=true means only match the exact path (for parent routes that have sub-routes)
  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href);

  // Base styles for menu links
  const menuLinkClass = (href: string, exact = false) => clsx(
    'flex w-full items-center rounded-lg px-3 py-2 text-left text-sm',
    isActive(href, exact)
      ? 'bg-primary/10 dark:bg-foreground/5 text-primary shadow-[inset_0_0_0_1px_#38786052] dark:shadow-[inset_0_0_0_1px_#ededed1c] after:ml-auto after:size-1.5 after:shrink-0 after:rounded-full after:bg-primary'
      : 'hover:bg-background',
  );

  // Close menu immediately when clicking a link
  const closeMenu = () => {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  };

  // Close menu when clicking outside (progressive enhancement)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (detailsRef.current && !detailsRef.current.contains(event.target as Node)) {
        detailsRef.current.open = false;
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu when navigating (progressive enhancement)
  useEffect(() => {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  }, [pathname]);

  return (
    <details
      ref={detailsRef}
      className="relative group"
    >
      <summary
        className="list-none cursor-pointer block rounded-full hover:outline-primary hover:outline-2 focus:outline-primary focus:outline-2 outline-transparent group-open:outline-primary group-open:outline-2 [&::-webkit-details-marker]:hidden"
        aria-label="User menu"
      >
        {/* Show skeleton while loading, then actual avatar */}
        {!mounted || isLoading ? (
          <div
            className="h-12 w-12 animate-pulse rounded-full bg-border-color"
          />
        ) : (
          <Avatar
            size="md"
            avatarUrl={profile?.avatar_url}
            fullName={profile?.full_name}
            usePersonIconFallback
          />
        )}
      </summary>

      <div
        className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border-color-strong bg-background-light shadow-lg"
      >
        {user ? (
          <>
            {/* <div className="p-4">
                <p className="font-semibold truncate">
                  {user.user_metadata?.full_name || 'User'}
                </p>
                <p className="text-sm text-foreground/60 truncate">{user.email}</p>
              </div>

              <div className="border-t border-border-color-strong mx-4" /> */}

            <div
              className="p-2"
            >
              {profile?.nickname && (
                <Link
                  href={`/@${profile.nickname}`}
                  onClick={closeMenu}
                  className={menuLinkClass(`/@${profile.nickname}`, true)}
                >
                  <svg
                    className="mr-3 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  My profile
                </Link>
              )}
              <Link
                href="/account/events"
                onClick={closeMenu}
                className={menuLinkClass('/account/events')}
              >
                <svg
                  className="mr-3 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                My events
              </Link>
              <Link
                href="/account/challenges"
                onClick={closeMenu}
                className={menuLinkClass('/account/challenges')}
              >
                <svg
                  className="mr-3 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
                My challenges
              </Link>
              <Link
                href="/account/photos"
                onClick={closeMenu}
                className={menuLinkClass('/account/photos')}
              >
                <svg
                  className="mr-3 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Manage photos
              </Link>
              <Link
                href="/account"
                onClick={closeMenu}
                className={menuLinkClass('/account', true)}
              >
                <svg
                  className="mr-3 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Settings
              </Link>
              {isAdmin && (
                <Link
                  href={routes.admin.url}
                  onClick={closeMenu}
                  className={menuLinkClass(routes.admin.url)}
                >
                  <svg
                    className="mr-3 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  {routes.admin.label}
                </Link>
              )}
            </div>

            {/* Divider */}
            <div
              className="border-t border-border-color-strong mx-4"
            />

            <div
              className="p-2"
            >
              <button
                onClick={async () => {
                  const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
                  setTheme(newTheme);
                  // Save to database if user is logged in
                  if (user?.id) {
                    try {
                      await updateThemePreference(user.id, newTheme);
                    } catch (error) {
                      console.error('Failed to save theme preference:', error);
                    }
                  }
                }}
                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-background"
              >
                <svg
                  className="mr-3 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {mounted && resolvedTheme === 'dark' ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  )}
                </svg>
                {mounted && resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              </button>

              <form
                action={signOutAction}
                onSubmit={async (e) => {
                  // Progressive enhancement: use client-side signOut when JS is enabled
                  e.preventDefault();
                  if (detailsRef.current) detailsRef.current.open = false;
                  try {
                    await signOut();
                    // Only redirect if on a protected route, otherwise let React update the UI
                    const isProtectedRoute = pathname.startsWith('/account') || pathname.startsWith('/admin');
                    if (isProtectedRoute) {
                      window.location.href = '/';
                    }
                    // On public pages, the auth context will update the UI automatically
                  } catch (error) {
                    console.error('Error signing out:', error);
                  }
                }}
              >
                <input
                  type="hidden"
                  name="redirectTo"
                  value={pathname}
                />
                <button
                  type="submit"
                  className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/10"
                >
                  <svg
                    className="mr-3 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Sign out
                </button>
              </form>
            </div>
          </>
        ) : (
          <div
            className="p-2"
          >
            <Link
              href={`${routes.login.url}?redirectTo=${encodeURIComponent(pathname)}`}
              onClick={closeMenu}
              className={menuLinkClass(routes.login.url)}
            >
              <svg
                className="mr-3 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                />
              </svg>
              {routes.login.label}
            </Link>
            <Link
              href={`${routes.signup.url}?redirectTo=${encodeURIComponent(pathname)}`}
              onClick={closeMenu}
              className={menuLinkClass(routes.signup.url)}
            >
              <svg
                className="mr-3 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
              {routes.signup.label}
            </Link>

            <div
              className="border-t border-border-color mt-2 pt-2"
            >
              <button
                onClick={async () => {
                  const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
                  setTheme(newTheme);
                  // Note: Not saving to DB when not logged in (no user profile)
                }}
                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-background"
              >
                <svg
                  className="mr-3 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {mounted && resolvedTheme === 'dark' ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  )}
                </svg>
                {mounted && resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              </button>
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
