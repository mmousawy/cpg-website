'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { useMounted } from '@/hooks/useMounted';
import { useNotifications } from '@/hooks/useNotifications';
import { createMockNotifications } from '@/lib/actions/notifications';
import NotificationItem from './NotificationItem';

export default function NotificationButton() {
  const { user, profile } = useAuth();
  const { isAdmin } = useAdmin();
  const mounted = useMounted();
  const pathname = usePathname();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreatingMocks, setIsCreatingMocks] = useState(false);

  const { notifications, unseenCount, totalCount, hasMore, isLoading, isLoadingMore, markAsSeen, loadMore } = useNotifications(user?.id || null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (detailsRef.current && !detailsRef.current.contains(event.target as Node)) {
        detailsRef.current.open = false;
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown when navigating
  useEffect(() => {
    if (detailsRef.current) {
      detailsRef.current.open = false;
      setIsOpen(false);
    }
  }, [pathname]);

  // Handle notification click (view)
  const handleView = async (notificationId: string) => {
    await markAsSeen(notificationId);
    if (detailsRef.current) {
      detailsRef.current.open = false;
      setIsOpen(false);
    }
  };

  // Handle create mock notifications
  const handleCreateMocks = async () => {
    setIsCreatingMocks(true);
    try {
      await createMockNotifications();
      // Notify all useNotifications instances to refresh
      window.dispatchEvent(new CustomEvent('notifications:refresh'));
    } catch (error) {
      console.error('Error creating mock notifications:', error);
    } finally {
      setIsCreatingMocks(false);
    }
  };

  // Don't show if not logged in
  if (!user || !mounted) {
    return null;
  }

  return (
    <details
      ref={detailsRef}
      className="relative group"
      onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary
        className="list-none cursor-pointer relative flex items-center justify-center size-10 rounded-full hover:bg-foreground/5 transition-colors [&::-webkit-details-marker]:hidden"
        aria-label="Notifications"
      >
        <svg
          className="h-5 w-5 text-foreground/70"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unseenCount > 0 && (
          <span
            className={clsx(
              'absolute top-1 right-1 bg-red-500 text-white text-[10px] font-medium',
              'rounded-full min-w-4 h-4 flex items-center justify-center px-1',
              unseenCount > 99 && 'text-[9px]',
            )}
          >
            {unseenCount > 99 ? '99+' : unseenCount}
          </span>
        )}
      </summary>

      <div
        className="absolute right-0 top-full z-50 mt-2 w-80 max-h-[32rem] overflow-hidden rounded-xl border border-border-color-strong bg-background-light shadow-lg"
      >
        <div
          className="flex flex-col max-h-[32rem]"
        >
          {/* Header */}
          <div
            className="flex items-center justify-between border-b border-border-color-strong px-4 py-3"
          >
            <h3
              className="font-semibold text-sm"
            >
              Notifications
            </h3>
            {unseenCount > 0 && (
              <span
                className="text-xs text-foreground/60"
              >
                {unseenCount}
                {' '}
                unseen
              </span>
            )}
          </div>

          {/* Notifications list */}
          <div
            className="overflow-y-auto flex-1"
          >
            {isLoading ? (
              <div
                className="py-8 text-center"
              >
                <div
                  className="animate-pulse text-foreground/40"
                >
                  Loading...
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <div
                className="py-8 px-4 flex flex-col items-center"
              >
                <div
                  className="mb-3 rounded-full bg-primary/10 p-3"
                >
                  <svg
                    className="h-8 w-8 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                    />
                  </svg>
                </div>
                <p
                  className="text-foreground/80 font-medium mb-1"
                >
                  All caught up!
                </p>
                <p
                  className="text-xs text-foreground/50 mb-4"
                >
                  New notifications will appear here
                </p>
                {isAdmin && (
                  <button
                    onClick={handleCreateMocks}
                    disabled={isCreatingMocks}
                    className="text-xs text-primary hover:text-primary/80 font-medium disabled:opacity-50"
                  >
                    {isCreatingMocks ? 'Creating...' : 'Create mock notifications'}
                  </button>
                )}
              </div>
            ) : (
              <div
                className="divide-y divide-border-color"
              >
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onView={handleView}
                  />
                ))}
                {/* Load more button */}
                {hasMore && (
                  <div
                    className="p-0 text-center"
                  >
                    <button
                      onClick={loadMore}
                      disabled={isLoadingMore}
                      className="text-sm text-primary hover:text-foreground font-medium disabled:opacity-50 px-4 py-3 w-full hover:bg-background"
                    >
                      {isLoadingMore ? 'Loading...' : 'Load more'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div
              className="border-t border-border-color-strong"
            >
              <Link
                href="/account/activity"
                className="block text-center text-sm text-primary hover:text-foreground font-medium hover:bg-background px-4 py-3 w-full"
                onClick={() => {
                  if (detailsRef.current) {
                    detailsRef.current.open = false;
                    setIsOpen(false);
                  }
                }}
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      </div>
    </details>
  );
}
