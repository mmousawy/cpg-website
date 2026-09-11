'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { routes } from '@/config/routes';
import { useSession } from '@/hooks/useSession';
import { subscribeRouteChange } from '@/lib/routeChange';
import CategoryLocationSVG from 'public/icons/category-location.svg';
import MobileAccountMenu from './MobileAccountMenu';
import TabBarPopoverAnchor from './TabBarPopoverAnchor';
import TabBarPopoverBackdrop from './TabBarPopoverBackdrop';
import { mobileScrimZClassName, mobileTabActiveClassName, mobileTabActivePillClassName, mobileTabBarZClassName } from './mobileChrome';

type PopoverId = 'events' | 'gallery' | 'members';
type TabId = 'home' | PopoverId;

type MenuItem =
  | { type: 'link'; href: string; label: string; icon: React.ReactNode }
  | { type: 'action'; label: string; icon: React.ReactNode; action: () => void };

const LONG_PRESS_MS = 400;

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

const CHALLENGES_ICON = (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const SEARCH_ICON = (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

function matchesPath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function TabPopover({
  open,
  items,
  onClose,
}: {
  open: boolean;
  items: MenuItem[];
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <TabBarPopoverAnchor open={open}>
      <ul className="p-1">
        {items.map((item) => {
          const isCurrent = item.type === 'link' && matchesPath(pathname, item.href);
          const className = clsx(
            'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
            isCurrent
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-foreground hover:bg-background-medium',
          );

          if (item.type === 'link') {
            return (
              <li key={item.href} role="none">
                <Link
                  href={item.href}
                  prefetch={false}
                  role="menuitem"
                  onClick={onClose}
                  className={className}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            );
          }

          return (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  item.action();
                  onClose();
                }}
                className={className}
              >
                {item.icon}
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </TabBarPopoverAnchor>
  );
}

function NestedTab({
  id,
  label,
  icon,
  primaryHref,
  isActive,
  items,
  openPopover,
  onOpenPopover,
  onClosePopover,
}: {
  id: PopoverId;
  label: string;
  icon: React.ReactNode;
  primaryHref: string;
  isActive: boolean;
  items: MenuItem[];
  openPopover: PopoverId | null;
  onOpenPopover: (id: PopoverId) => void;
  onClosePopover: () => void;
}) {
  const router = useRouter();
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = useRef(false);

  const clearLongPress = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  const handlePointerDown = () => {
    longPressedRef.current = false;
    clearLongPress();
    longPressRef.current = setTimeout(() => {
      longPressedRef.current = true;
      onOpenPopover(id);
    }, LONG_PRESS_MS);
  };

  const handlePointerUp = () => {
    clearLongPress();
  };

  const handleClick = (e: React.MouseEvent) => {
    if (longPressedRef.current) {
      e.preventDefault();
      longPressedRef.current = false;
      return;
    }

    if (isActive) {
      e.preventDefault();
      onOpenPopover(id);
      return;
    }

    e.preventDefault();
    router.push(primaryHref);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onOpenPopover(id);
  };

  return (
    <li className="relative">
      <TabPopover
        open={openPopover === id}
        items={items}
        onClose={onClosePopover}
      />
      <button
        type="button"
        aria-current={isActive ? 'page' : undefined}
        aria-expanded={openPopover === id}
        aria-haspopup="menu"
        data-mobile-tab={id}
        className={tabButtonClass(isActive)}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={handleContextMenu}
      >
        <TabIcon>{icon}</TabIcon>
        <span className="max-w-full truncate text-[0.625rem] font-medium leading-tight">
          {label}
        </span>
      </button>
    </li>
  );
}

/** Must stay inside `<Suspense>` — `usePathname()` is a blocking client hook. */
export default function MobileTabBar() {
  const pathname = usePathname();
  const { profile } = useSession();
  const containerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const tabListRef = useRef<HTMLUListElement>(null);
  const [openPopover, setOpenPopover] = useState<PopoverId | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [indicator, setIndicator] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [indicatorReady, setIndicatorReady] = useState(false);

  const closePopover = useCallback(() => setOpenPopover(null), []);

  const handleOpenPopover = useCallback((id: PopoverId) => {
    setAccountOpen(false);
    setOpenPopover(id);
  }, []);

  const closeAllPopovers = useCallback(() => {
    closePopover();
    setAccountOpen(false);
  }, [closePopover]);

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
      closePopover();
      setAccountOpen(false);
    });
  }, [closePopover]);

  useEffect(() => {
    closePopover();
  }, [pathname, closePopover]);

  useEffect(() => {
    if (!openPopover && !accountOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (navRef.current?.contains(e.target as Node)) return;
      closeAllPopovers();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAllPopovers();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openPopover, accountOpen, closeAllPopovers]);

  const handleNavPointerDown = (e: React.PointerEvent) => {
    const accountRoot = navRef.current?.querySelector('[data-account-menu]');
    if (accountRoot?.contains(e.target as Node)) return;
    if (accountOpen) setAccountOpen(false);
  };

  const isAnyPopoverOpen = openPopover !== null || accountOpen;

  const openSearch = () => {
    window.dispatchEvent(new CustomEvent('search:open'));
  };

  const isHomeActive = pathname === '/';
  const isEventsActive = matchesPath(pathname, routes.events.url) || matchesPath(pathname, routes.scene.url);
  const isGalleryActive = matchesPath(pathname, routes.gallery.url) || matchesPath(pathname, routes.challenges.url);
  const isMembersActive = matchesPath(pathname, routes.members.url);
  const isAvatarActive = accountOpen
    || pathname.startsWith('/account')
    || pathname.startsWith('/admin')
    || (profile?.nickname ? pathname === `/@${profile.nickname}` || pathname.startsWith(`/@${profile.nickname}/`) : false);

  const activeTab: TabId | null = isHomeActive
    ? 'home'
    : isEventsActive
      ? 'events'
      : isGalleryActive
        ? 'gallery'
        : isMembersActive
          ? 'members'
          : null;

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

  const eventsMenu: MenuItem[] = [
    { type: 'link', href: routes.events.url, label: routes.events.label, icon: EVENTS_ICON },
    { type: 'link', href: routes.scene.url, label: routes.scene.label, icon: <CategoryLocationSVG className="size-5 fill-current" /> },
  ];

  const galleryMenu: MenuItem[] = [
    { type: 'link', href: routes.gallery.url, label: routes.gallery.label, icon: GALLERY_ICON },
    { type: 'link', href: routes.challenges.url, label: routes.challenges.label, icon: CHALLENGES_ICON },
  ];

  const membersMenu: MenuItem[] = [
    { type: 'link', href: routes.members.url, label: routes.members.label, icon: MEMBERS_ICON },
    { type: 'action', label: 'Search', icon: SEARCH_ICON, action: openSearch },
  ];

  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isHomeActive) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
      <TabBarPopoverBackdrop open={isAnyPopoverOpen} onClose={closeAllPopovers} />

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

            <NestedTab
              id="events"
              label={routes.events.label}
              icon={EVENTS_ICON}
              primaryHref={routes.events.url}
              isActive={isEventsActive}
              items={eventsMenu}
              openPopover={openPopover}
              onOpenPopover={handleOpenPopover}
              onClosePopover={closePopover}
            />

            <NestedTab
              id="gallery"
              label={routes.gallery.label}
              icon={GALLERY_ICON}
              primaryHref={routes.gallery.url}
              isActive={isGalleryActive}
              items={galleryMenu}
              openPopover={openPopover}
              onOpenPopover={handleOpenPopover}
              onClosePopover={closePopover}
            />

            <NestedTab
              id="members"
              label={routes.members.label}
              icon={MEMBERS_ICON}
              primaryHref={routes.members.url}
              isActive={isMembersActive}
              items={membersMenu}
              openPopover={openPopover}
              onOpenPopover={handleOpenPopover}
              onClosePopover={closePopover}
            />

            <li className="relative flex items-center justify-center">
              <MobileAccountMenu
                active={isAvatarActive}
                avatarUrl={profile?.avatar_url}
                fullName={profile?.full_name}
                onOpenChange={(open) => {
                  setAccountOpen(open);
                  if (open) closePopover();
                }}
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
