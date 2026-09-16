'use client';

import clsx from 'clsx';
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useMounted } from '@/hooks/useMounted';
import { useNotifications } from '@/hooks/useNotifications';
import { subscribeRouteChange } from '@/lib/routeChange';
import Avatar from '../auth/Avatar';
import AccountMenuPanel from './AccountMenuPanel';
import TabBarPopoverAnchor from './TabBarPopoverAnchor';
import { NotificationBadge, NotificationsSheet } from '../notifications/NotificationsSheet';

type MobileAccountMenuProps = {
  avatarUrl?: string | null;
  fullName?: string | null;
  active?: boolean;
  /** When set, open state is controlled by the parent (e.g. tab bar backdrop). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function MobileAccountMenuContent({
  avatarUrl,
  fullName,
  active = false,
  open: openControlled,
  onOpenChange,
}: MobileAccountMenuProps) {
  const { user } = useAuth();
  const mounted = useMounted();
  const rootRef = useRef<HTMLDivElement>(null);
  const [accountOpenUncontrolled, setAccountOpenUncontrolled] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { unseenCount } = useNotifications(user?.id || null);

  const isControlled = openControlled !== undefined;
  const accountOpen = isControlled ? openControlled : accountOpenUncontrolled;

  const setOpen = (open: boolean) => {
    if (!isControlled) {
      setAccountOpenUncontrolled(open);
    }
    onOpenChange?.(open);
  };

  useLayoutEffect(() => {
    return subscribeRouteChange(() => {
      setOpen(false);
      setNotificationsOpen(false);
    });
  }, [onOpenChange]);

  useEffect(() => {
    if (!accountOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [accountOpen, onOpenChange]);

  const openNotifications = () => {
    setNotificationsOpen(true);
    window.dispatchEvent(new CustomEvent('notifications:sheet-open'));
  };

  if (!mounted) {
    return (
      <div
        className="size-8 shrink-0 animate-pulse rounded-full bg-border-color"
        aria-hidden
      />
    );
  }

  const ariaLabel = user ? 'Open account menu' : 'Log in or sign up';

  return (
    <>
      <div ref={rootRef} className="relative w-full" data-account-menu>
        <button
          type="button"
          onClick={() => setOpen(!accountOpen)}
          className={clsx(
            'relative z-10 flex min-h-10 w-full flex-col items-center justify-center rounded-xl px-0.5 py-1.5 transition-colors',
            'text-foreground/55 hover:bg-background-medium/80',
          )}
          aria-label={ariaLabel}
          aria-expanded={accountOpen}
          aria-haspopup="menu"
        >
          <span
            className={clsx(
              'relative rounded-full',
              active && 'outline outline-2 outline-primary outline-offset-2',
            )}
          >
            <Avatar
              size="xs"
              avatarUrl={avatarUrl}
              fullName={fullName}
              usePersonIconFallback
            />
            {user && <NotificationBadge count={unseenCount} />}
          </span>
        </button>

        <TabBarPopoverAnchor
          open={accountOpen}
          align="end"
          widthClass="w-64 max-w-[calc(100vw-1.5rem)]"
          panelClassName="overflow-hidden"
        >
          <AccountMenuPanel
            onClose={() => setOpen(false)}
            showNotificationsEntry={Boolean(user)}
            showSiteLinks
            unseenCount={unseenCount}
            onOpenNotifications={openNotifications}
          />
        </TabBarPopoverAnchor>
      </div>

      {user && (
        <NotificationsSheet
          isOpen={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
        />
      )}
    </>
  );
}

export default function MobileAccountMenu(props: MobileAccountMenuProps) {
  return (
    <Suspense
      fallback={(
        <div
          className="size-8 shrink-0 animate-pulse rounded-full bg-border-color"
          aria-hidden
        />
      )}
    >
      <MobileAccountMenuContent {...props} />
    </Suspense>
  );
}
