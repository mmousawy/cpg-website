import Link from 'next/link';
import LogoSVG from 'public/cpg-logo.svg';
import { Suspense } from 'react';

import { routes } from '@/config/routes';
import HeaderFrame from './HeaderFrame';
import HeaderNotifications from './HeaderNotifications';
import HeaderSiteSearch from './HeaderSiteSearch';
import NavActiveMarker from './NavActiveMarker';
import UserMenu from './UserMenu';

const navItems = [
  routes.events,
  routes.scene,
  routes.challenges,
  routes.gallery,
  routes.members,
] as const;

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="relative py-1 font-medium transition-colors hover:text-primary rounded text-[15px] text-foreground has-data-active:text-primary dark:has-data-active:text-primary-alt"
    >
      {children}
      <Suspense
        fallback={null}
      >
        <NavActiveMarker
          href={href}
        />
      </Suspense>
    </Link>
  );
}

export default function Header() {
  return (
    <HeaderFrame
      className="app-site-header sticky top-0 z-40 hidden justify-center border-b border-b-border-color border-t-primary bg-background-light px-2 py-2 text-foreground shadow-md shadow-[#00000005] sm:flex"
    >
      <div
        className="app-header-inner flex w-full max-w-screen-md items-center justify-between gap-4"
      >
        <div
          className="flex items-center gap-5"
        >
          <Link
            href="/"
            prefetch={false}
            className="rounded-full"
            aria-label="Creative Photography Group Home"
          >
            <LogoSVG
              className="block size-14"
            />
          </Link>

          <nav
            className="hidden items-center gap-5 sm:flex"
          >
            {navItems.map((item) => (
              <NavLink
                key={item.url}
                href={item.url}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div
          className="flex items-center gap-3"
        >
          <div
            className="hidden sm:flex items-center gap-2"
          >
            <HeaderSiteSearch />
            <HeaderNotifications />
            <Suspense
              fallback={
                <div
                  className="size-12 shrink-0 animate-pulse rounded-full bg-border-color"
                  aria-hidden
                />
              }
            >
              <UserMenu />
            </Suspense>
          </div>
        </div>
      </div>
    </HeaderFrame>
  );
}
