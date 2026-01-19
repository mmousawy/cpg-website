'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoSVG from 'public/cpg-logo.svg';
import { useState } from 'react';

import { routes } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';
import { useMounted } from '@/hooks/useMounted';
import Avatar from '../auth/Avatar';
import MobileNotificationButton from '../notifications/MobileNotificationButton';
import NotificationButton from '../notifications/NotificationButton';
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
        'relative py-1 font-medium transition-colors hover:text-primary rounded',
        isActive ? 'text-primary' : 'text-foreground',
      )}
    >
      {children}
      {isActive && (
        <span
          className="absolute -bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary"
        />
      )}
    </Link>
  );
}

// Paths where the header should be full-width (no max-w constraint)
const fullWidthPaths = ['/account/photos', '/account/albums'];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const mounted = useMounted();
  const { profile } = useAuth();

  // Check if current path should have full-width header
  const isFullWidth = fullWidthPaths.some((path) => pathname.startsWith(path));

  return (
    <header
      className="sticky top-0 z-40 flex justify-center border-b-[0.0625rem] border-b-border-color border-t-primary bg-background-light px-4 py-2 text-foreground shadow-md shadow-[#00000005]"
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
            className="hidden items-center gap-6 sm:flex"
          >
            <NavLink
              href={routes.home.url}
            >
              {routes.home.label}
            </NavLink>
            <NavLink
              href={routes.events.url}
            >
              {routes.events.label}
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

        {/* Right: Notifications + User Menu (Desktop) / Mobile Menu Button (Mobile) */}
        <div
          className="flex items-center gap-3"
        >
          {/* Desktop Only: Notifications + UserMenu */}
          <div
            className="hidden sm:flex items-center gap-2"
          >
            <NotificationButton />
            <UserMenu />
          </div>

          {/* Mobile Only: Notifications + Avatar + Menu Button */}
          <div
            className="flex items-center gap-2 sm:hidden"
          >
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
    </header>
  );
}
