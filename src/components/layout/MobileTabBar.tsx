'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { routes } from '@/config/routes';
import { useSession } from '@/hooks/useSession';
import { subscribeRouteChange } from '@/lib/routeChange';
import MobileAccountMenu from './MobileAccountMenu';
import TabBarPopoverBackdrop from './TabBarPopoverBackdrop';
import { mobileScrimZClassName, mobileTabActiveClassName, mobileTabActivePillClassName, mobileTabBarZClassName } from './mobileChrome';

type TabId = 'home' | 'events' | 'gallery' | 'members';

function TabIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center" aria-hidden>
      {children}
    </span>
  );
}

function tabButtonClass(active: boolean) {
  return clsx(
    'relative z-10 flex min-h-10 w-full flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1.5 text-center transition-colors',
    active
      ? mobileTabActiveClassName
      : 'text-foreground/55 hover:bg-background-medium/80 hover:text-foreground/80',
  );
}

const HOME_ICON = (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const EVENTS_ICON = (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const GALLERY_ICON = (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const MEMBERS_ICON = (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

function matchesPath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Must stay inside `<Suspense>` — `usePathname()` is a blocking client hook. */
export default function MobileTabBar() {
  const pathname = usePathname();
  const { profile } = useSession();
  const containerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const tabListRef = useRef<HTMLDivElement>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState<TabId | null>(null);
  const [indicator, setIndicator] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [indicatorReady, setIndicatorReady] = useState(false);

  const closeAccount = useCallback(() => setAccountOpen(false), []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const el = containerRef.current;
    if (!el) return;

    const updateOffset = () => {
      const height = el.getBoundingClientRect().height;
      root.style.setProperty('--mobile-nav-offset', `${height}px`);
    };

    updateOffset();

    const observer = new ResizeObserver(updateOffset);
    observer.observe(el);
    window.addEventListener('resize', updateOffset);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateOffset);
      root.style.removeProperty('--mobile-nav-offset');
    };
  }, []);

  useLayoutEffect(() => {
    return subscribeRouteChange(() => {
      setAccountOpen(false);
    });
  }, []);

  useEffect(() => {
    setPendingTab(null);
  }, [pathname]);

  useEffect(() => {
    if (!accountOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (navRef.current?.contains(e.target as Node)) return;
      closeAccount();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAccount();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [accountOpen, closeAccount]);

  const handleNavPointerDown = (e: React.PointerEvent) => {
    const accountRoot = navRef.current?.querySelector('[data-account-menu]');
    if (accountRoot?.contains(e.target as Node)) return;
    if (accountOpen) setAccountOpen(false);
  };

  const isHomeCurrent = pathname === '/';
  const isEventsCurrent = matchesPath(pathname, routes.events.url) || matchesPath(pathname, routes.scene.url);
  const isGalleryCurrent = matchesPath(pathname, routes.gallery.url) || matchesPath(pathname, routes.challenges.url);
  const isMembersCurrent = matchesPath(pathname, routes.members.url);
  const pathTab: TabId | null = isHomeCurrent
    ? 'home'
    : isEventsCurrent
      ? 'events'
      : isGalleryCurrent
        ? 'gallery'
        : isMembersCurrent
          ? 'members'
          : null;

  const activeTab: TabId | null = pendingTab ?? pathTab;
  const isHomeActive = activeTab === 'home';
  const isEventsActive = activeTab === 'events';
  const isGalleryActive = activeTab === 'gallery';
  const isMembersActive = activeTab === 'members';

  useLayoutEffect(() => {
    const list = tabListRef.current;
    if (!list || !activeTab) {
      setIndicator(null);
      return;
    }

    const updateIndicator = () => {
      const tab = list.querySelector<HTMLElement>(`[data-mobile-tab="${activeTab}"]`);
      if (!tab) return;

      const listRect = list.getBoundingClientRect();
      const tabRect = tab.getBoundingClientRect();
      setIndicator({
        x: tabRect.left - listRect.left,
        y: tabRect.top - listRect.top,
        w: tabRect.width,
        h: tabRect.height - 1,
      });
    };

    updateIndicator();
    const frame = window.requestAnimationFrame(() => setIndicatorReady(true));

    const resizeObserver = new ResizeObserver(updateIndicator);
    resizeObserver.observe(list);
    resizeObserver.observe(list.querySelector<HTMLElement>(`[data-mobile-tab="${activeTab}"]`) ?? list);
    const mutationObserver = new MutationObserver(updateIndicator);
    mutationObserver.observe(list, { childList: true, subtree: true });
    window.addEventListener('resize', updateIndicator);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', updateIndicator);
    };
  }, [activeTab]);

  const handleTabClick = (e: React.MouseEvent<HTMLAnchorElement>, tab: TabId, isCurrent: boolean) => {
    if (isCurrent) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setPendingTab(tab);
  };

  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    handleTabClick(e, 'home', isHomeCurrent);
  };

  return (
    <>
      <div
        className={clsx(
          'mobile-tab-bar-scrim pointer-events-none fixed inset-x-0 bottom-0 sm:hidden',
          mobileScrimZClassName,
        )}
        aria-hidden
      >
        <div className="mobile-tab-bar-scrim__tone mobile-tab-bar-scrim__tone--default absolute inset-0 mobile-tab-bar-scrim__fade" />
        <div className="mobile-tab-bar-scrim__tone mobile-tab-bar-scrim__tone--sticky absolute inset-0 mobile-tab-bar-scrim__fade mobile-tab-bar-scrim__fade--sticky" />
      </div>

      <div className={clsx('mobile-tab-bar pointer-events-none fixed inset-x-0 bottom-0 sm:hidden', mobileTabBarZClassName)}>
      <TabBarPopoverBackdrop open={accountOpen} onClose={closeAccount} />

      <div ref={containerRef} className="relative">
        <nav
          ref={navRef}
          aria-label="Main"
          onPointerDownCapture={handleNavPointerDown}
          className="pointer-events-auto relative z-10 mx-3 mb-[max(0.5rem,env(safe-area-inset-bottom))] overflow-visible rounded-2xl border border-border-color-strong bg-background-light/85 bg-no-noise shadow-lg backdrop-blur-sm"
        >
          <div ref={tabListRef} className="relative">
            {indicator && (
              <div
                aria-hidden
                className={clsx(
                  'mobile-tab-indicator pointer-events-none absolute top-0 left-0 z-0 rounded-xl',
                  mobileTabActivePillClassName,
                  indicatorReady && 'is-ready',
                )}
                style={{
                  width: indicator.w,
                  height: indicator.h,
                  transform: `translate(${indicator.x}px, ${indicator.y}px)`,
                }}
              />
            )}
            <ul className="relative z-10 grid grid-cols-5 gap-1.5 p-1.5">
            <li>
              <Link
                href={routes.home.url}
                prefetch={false}
                aria-current={isHomeActive ? 'page' : undefined}
                data-mobile-tab="home"
                onClick={handleHomeClick}
                className={tabButtonClass(isHomeActive)}
              >
                <TabIcon>{HOME_ICON}</TabIcon>
                <span className="max-w-full truncate text-[0.625rem] font-medium leading-tight">
                  {routes.home.label}
                </span>
              </Link>
            </li>

            <li>
              <Link
                href={routes.events.url}
                prefetch={false}
                aria-current={isEventsActive ? 'page' : undefined}
                data-mobile-tab="events"
                onClick={(e) => handleTabClick(e, 'events', isEventsCurrent)}
                className={tabButtonClass(isEventsActive)}
              >
                <TabIcon>{EVENTS_ICON}</TabIcon>
                <span className="max-w-full truncate text-[0.625rem] font-medium leading-tight">
                  {routes.events.label}
                </span>
              </Link>
            </li>

            <li>
              <Link
                href={routes.gallery.url}
                prefetch={false}
                aria-current={isGalleryActive ? 'page' : undefined}
                data-mobile-tab="gallery"
                onClick={(e) => handleTabClick(e, 'gallery', isGalleryCurrent)}
                className={tabButtonClass(isGalleryActive)}
              >
                <TabIcon>{GALLERY_ICON}</TabIcon>
                <span className="max-w-full truncate text-[0.625rem] font-medium leading-tight">
                  {routes.gallery.label}
                </span>
              </Link>
            </li>

            <li>
              <Link
                href={routes.members.url}
                prefetch={false}
                aria-current={isMembersActive ? 'page' : undefined}
                data-mobile-tab="members"
                onClick={(e) => handleTabClick(e, 'members', isMembersCurrent)}
                className={tabButtonClass(isMembersActive)}
              >
                <TabIcon>{MEMBERS_ICON}</TabIcon>
                <span className="max-w-full truncate text-[0.625rem] font-medium leading-tight">
                  {routes.members.label}
                </span>
              </Link>
            </li>

            <li className="relative flex items-center justify-center">
              <MobileAccountMenu
                active={accountOpen}
                avatarUrl={profile?.avatar_url}
                fullName={profile?.full_name}
                open={accountOpen}
                onOpenChange={setAccountOpen}
              />
            </li>
          </ul>
          </div>
        </nav>
      </div>
    </div>
    </>
  );
}
