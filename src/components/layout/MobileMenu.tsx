'use client';

import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import clsx from 'clsx';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { routes } from '@/config/routes';
import { signOutAction } from '@/app/actions/auth';

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  mounted: boolean
}

export default function MobileMenu({ isOpen, onClose, mounted }: MobileMenuProps) {
  const { user, profile, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();

  // Helper to check if a route is active
  // exact=true means only match the exact path (for parent routes that have sub-routes)
  const isActive = (href: string, exact = false) => {
    if (exact || href === '/') return pathname === href;
    return pathname.startsWith(href);
  };

  // Base styles for nav links (matches UserMenu styling)
  const navLinkClass = (href: string, exact = false) => clsx(
    "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium",
    isActive(href, exact)
      ? "bg-primary/10 dark:bg-foreground/5 text-primary shadow-[inset_0_0_0_1px_#38786052] dark:shadow-[inset_0_0_0_1px_#ededed1c]"
      : "hover:bg-background",
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Dark overlay - rendered via portal to escape header's stacking context */}
      {mounted && createPortal(
        <div
          className="fixed inset-0 z-30 bg-black/40 dark:bg-black/60 backdrop-blur-[1px]"
          onClick={onClose}
          aria-hidden="true"
        />,
        document.body,
      )}

      {/* Menu panel */}
      <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border-color-strong bg-background-light shadow-lg">
        {/* Navigation Links */}
        <div className="p-2">
          <Link
            href={routes.home.url}
            onClick={onClose}
            className={navLinkClass(routes.home.url)}
          >
            <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {routes.home.label}
          </Link>
          <Link
            href={routes.galleries.url}
            onClick={onClose}
            className={navLinkClass(routes.galleries.url)}
          >
            <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {routes.galleries.label}
          </Link>
          <Link
            href={routes.events.url}
            onClick={onClose}
            className={navLinkClass(routes.events.url)}
          >
            <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {routes.events.label}
          </Link>
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-border-color-strong" />

        {/* User Menu Items */}
        {user ? (
          <>
            {/* <div className="p-4 pb-0">
            <p className="truncate font-semibold">{user.user_metadata?.full_name || 'User'}</p>
            <p className="truncate text-sm text-foreground/60">{user.email}</p>
          </div> */}

            <div className="p-2">
              {profile?.nickname && (
                <Link
                  href={`/@${profile.nickname}`}
                  onClick={onClose}
                  className={navLinkClass(`/@${profile.nickname}`, true)}
                >
                  <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                My profile
                </Link>
              )}
              <Link
                href="/account/events"
                onClick={onClose}
                className={navLinkClass('/account/events')}
              >
                <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              My events
              </Link>
              <Link
                href="/account/photos"
                onClick={onClose}
                className={navLinkClass('/account/photos')}
              >
                <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              Manage photos
              </Link>
              <Link
                href="/account"
                onClick={onClose}
                className={navLinkClass('/account', true)}
              >
                <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              Settings
              </Link>
              {isAdmin && (
                <Link
                  href={routes.admin.url}
                  onClick={onClose}
                  className={navLinkClass(routes.admin.url)}
                >
                  <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  {routes.admin.label}
                </Link>
              )}
            </div>

            {/* Divider */}
            <div className="mx-4 border-t border-border-color-strong" />

            <div className="p-2">
              <button
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-background"
              >
                <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mounted && resolvedTheme === 'dark' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  )}
                </svg>
                {mounted && resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              </button>
              <form
                action={signOutAction}
                onSubmit={async (e) => {
                // Progressive enhancement: use client-side signOut when JS is enabled
                  e.preventDefault();
                  onClose();
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
                <input type="hidden" name="redirectTo" value={pathname} />
                <button
                  type="submit"
                  className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/10"
                >
                  <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                Sign out
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="p-2">
            <Link
              href={`${routes.login.url}?redirectTo=${encodeURIComponent(pathname)}`}
              onClick={onClose}
              className={navLinkClass(routes.login.url)}
            >
              <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              {routes.login.label}
            </Link>
            <Link
              href={`${routes.signup.url}?redirectTo=${encodeURIComponent(pathname)}`}
              onClick={onClose}
              className={navLinkClass(routes.signup.url)}
            >
              <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              {routes.signup.label}
            </Link>

            {/* Divider */}
            <div className="mx-2 my-2 border-t border-border-color-strong" />

            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-background"
            >
              <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mounted && resolvedTheme === 'dark' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                )}
              </svg>
              {mounted && resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
