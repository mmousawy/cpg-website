'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoSVG from 'public/cpg-logo.svg';
import { useEffect, useMemo, useState } from 'react';

import { routes } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';
import { useMounted } from '@/hooks/useMounted';
import Avatar from '../auth/Avatar';
import MobileNotificationButton from '../notifications/MobileNotificationButton';
import NotificationButton from '../notifications/NotificationButton';
import SearchModal from '../search/SearchModal';
import MobileMenu from './MobileMenu';
import UserMenu from './UserMenu';

// Navigation link component with active state
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={clsx(
        'relative py-1 font-medium transition-colors hover:text-primary rounded text-[15px]',
        isActive ? 'text-primary' : 'text-foreground',
      )}
    >
      {children}
      {isActive && (
        <span
          className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary"
        />
      )}
    </Link>
  );
}

// Paths where the header should be full-width (no max-w constraint)
const fullWidthPaths = ['/account/photos', '/account/albums'];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const mounted = useMounted();
  const { profile } = useAuth();

  // Detect Mac vs other OS for keyboard shortcut display (only after mount)
  const isMac = useMemo(() => {
    if (!mounted) return true; // Default to Mac symbol for SSR
    return navigator.platform.toLowerCase().includes('mac');
  }, [mounted]);

  // Close mobile menu when notification sheet opens
  useEffect(() => {
    const handleNotificationSheetOpen = () => {
      setMobileMenuOpen(false);
    };

    window.addEventListener('notifications:sheet-open', handleNotificationSheetOpen);
    return () => {
      window.removeEventListener('notifications:sheet-open', handleNotificationSheetOpen);
    };
  }, []);

  // Global keyboard shortcut: Cmd+K / Ctrl+K to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Check if current path should have full-width header
  const isFullWidth = fullWidthPaths.some((path) => pathname.startsWith(path));

  return (
    <header
      className="sticky top-0 z-40 flex justify-center border-b-[0.0625rem] border-b-border-color border-t-primary bg-background-light px-2 py-2 text-foreground shadow-md shadow-[#00000005]"
    >
      <div
        className={clsx(
          'flex w-full items-center justify-between gap-4',
          !isFullWidth && 'max-w-screen-md',
        )}
      >
        {/* Left: Logo + Desktop Nav */}
        <div
          className="flex items-center gap-6"
        >
          <Link
            href="/"
            className="rounded-full"
            aria-label="Creative Photography Group Home"
          >
            <LogoSVG
              className="block size-14 max-sm:size-10"
            />
          </Link>

          <nav
            className="hidden items-center gap-5 sm:flex"
          >
            <NavLink
              href={routes.events.url}
            >
              {routes.events.label}
            </NavLink>
            <NavLink
              href={routes.challenges.url}
            >
              {routes.challenges.label}
            </NavLink>
            <NavLink
              href={routes.gallery.url}
            >
              {routes.gallery.label}
            </NavLink>
            <NavLink
              href={routes.members.url}
            >
              {routes.members.label}
            </NavLink>
          </nav>
        </div>

        {/* Right: Search + Notifications + User Menu (Desktop) / Mobile Menu Button (Mobile) */}
        <div
          className="flex items-center gap-3"
        >
          {/* Desktop Only: Search + Notifications + UserMenu */}
          <div
            className="hidden sm:flex items-center gap-2"
          >
            {/* Search Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center gap-2 rounded-full p-2 text-foreground/70 transition-colors hover:text-foreground lg:rounded-lg lg:border lg:border-border-color lg:bg-background-medium lg:px-2 lg:py-1.5 lg:text-sm lg:hover:border-primary"
              aria-label="Search"
            >
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                className="size-5 lg:size-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <span
                className="hidden lg:inline text-foreground/60"
              >
                Search
              </span>
              <kbd
                className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border border-border-color bg-background px-1.5 font-mono text-xs font-medium text-foreground/50 [word-spacing:-0.25em]"
              >
                {isMac ? '⌘' : 'Ctrl'}
                {' + '}
                K
              </kbd>
            </button>
            <NotificationButton />
            <UserMenu />
          </div>

          {/* Mobile Only: Search + Notifications + Avatar + Menu Button */}
          <div
            className="flex items-center gap-2 sm:hidden"
          >
            {/* Mobile Search Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center rounded-full p-2 text-foreground/70 transition-colors hover:text-foreground"
              aria-label="Search"
            >
              <svg
                className="size-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
            {/* Mobile Notifications */}
            <MobileNotificationButton />

            {/* Mobile Avatar - opens mobile menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center justify-center overflow-hidden rounded-full"
              aria-label="Open menu"
            >
              <Avatar
                size="sm"
                avatarUrl={profile?.avatar_url}
                fullName={profile?.full_name}
              />
            </button>

            {/* Mobile Menu Button */}
            <div
              className="relative"
            >
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${mobileMenuOpen ? 'border-primary' : 'border-border-color hover:border-primary'
                }`}
                aria-label="Toggle menu"
              >
                <svg
                  className="h-5 w-5 fill-foreground"
                  viewBox="0 0 24 24"
                >
                  {mobileMenuOpen ? (
                    <path
                      d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                    />
                  ) : (
                    <path
                      d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"
                    />
                  )}
                </svg>
              </button>

              <MobileMenu
                isOpen={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
                mounted={mounted}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </header>
  );
}
