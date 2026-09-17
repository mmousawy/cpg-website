'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoSVG from 'public/cpg-logo.svg';
import { Suspense } from 'react';

import { routes } from '@/config/routes';
import { useSession } from '@/hooks/useSession';
import HeaderSiteSearch from './HeaderSiteSearch';
import UserMenu from './UserMenu';

const NotificationButton = dynamic(
  () => import('../notifications/NotificationButton'),
  {
    ssr: false,
    loading: () => (
      <div
        className="size-10 animate-pulse rounded-full bg-background-medium"
        aria-hidden
      />
    ),
  },
);

function NavActiveMarker({ href }: { href: string }) {
  const pathname = usePathname();
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
  if (!isActive) return null;

  return (
    <span
      data-active=""
      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary"
      aria-hidden
    />
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="relative py-1 font-medium transition-colors hover:text-primary rounded text-[15px] text-foreground has-data-active:text-primary dark:has-data-active:text-primary-alt"
    >
      {children}
      <Suspense fallback={null}>
        <NavActiveMarker href={href} />
      </Suspense>
    </Link>
  );
}

export default function Header() {
  const { user } = useSession();

  return (
    <header
      className="sticky top-0 z-40 hidden justify-center border-b border-b-border-color border-t-primary bg-background-light px-2 py-2 text-foreground shadow-md shadow-[#00000005] sm:flex"
    >
      <div className="app-header-inner flex w-full max-w-screen-md items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <Link
            href="/"
            prefetch={false}
            className="rounded-full"
            aria-label="Creative Photography Group Home"
          >
            <LogoSVG className="block size-14" />
          </Link>

          <nav className="hidden items-center gap-5 sm:flex">
            <NavLink href={routes.events.url}>{routes.events.label}</NavLink>
            <NavLink href={routes.scene.url}>{routes.scene.label}</NavLink>
            <NavLink href={routes.challenges.url}>{routes.challenges.label}</NavLink>
            <NavLink href={routes.gallery.url}>{routes.gallery.label}</NavLink>
            <NavLink href={routes.members.url}>{routes.members.label}</NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <Suspense fallback={null}>
              <HeaderSiteSearch />
            </Suspense>
            {user ? <NotificationButton /> : null}
            <Suspense
              fallback={
                <div className="size-12 shrink-0 animate-pulse rounded-full bg-border-color" aria-hidden />
              }
            >
              <UserMenu />
            </Suspense>
          </div>
        </div>
      </div>
    </header>
  );
}
