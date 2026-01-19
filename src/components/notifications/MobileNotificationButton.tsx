'use client';

import clsx from 'clsx';
import { useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useMounted } from '@/hooks/useMounted';
import { useNotifications } from '@/hooks/useNotifications';
import { createMockNotifications } from '@/lib/actions/notifications';
import BottomSheet from '../shared/BottomSheet';
import Button from '../shared/Button';
import NotificationItem from './NotificationItem';

export default function MobileNotificationButton() {
  const { user } = useAuth();
  const mounted = useMounted();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreatingMocks, setIsCreatingMocks] = useState(false);

  const { notifications, unseenCount, totalCount, hasMore, isLoading, isLoadingMore, markAsSeen, loadMore } = useNotifications(user?.id || null);

  // Handle notification click (view)
  const handleView = async (notificationId: string) => {
    await markAsSeen(notificationId);
    setIsOpen(false);
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
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          // Notify other components (like MobileMenu) to close
          window.dispatchEvent(new CustomEvent('notifications:sheet-open'));
        }}
        className="relative flex items-center justify-center size-8 rounded-full hover:bg-foreground/5 transition-colors"
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
              'absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-medium',
              'rounded-full min-w-3.5 h-3.5 flex items-center justify-center px-0.5',
            )}
          >
            {unseenCount > 99 ? '99+' : unseenCount}
          </span>
        )}
      </button>

      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Notifications"
        maxHeight={80}
      >
        <div
          className="flex flex-col h-full"
        >
          {/* Notifications list */}
          <div
            className="flex-1 overflow-y-auto"
          >
            {isLoading ? (
              <div
                className="flex flex-col items-center justify-center h-full py-12"
              >
                <div
                  className="animate-pulse text-foreground/40"
                >
                  Loading...
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center h-full py-12 px-6"
              >
                <div
                  className="mb-4 rounded-full bg-primary/10 p-4"
                >
                  <svg
                    className="h-10 w-10 text-primary"
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
                  className="text-sm text-foreground/50 text-center mb-4"
                >
                  New notifications will appear here
                </p>
                <button
                  onClick={handleCreateMocks}
                  disabled={isCreatingMocks}
                  className="text-sm text-primary hover:text-primary/80 font-medium disabled:opacity-50"
                >
                  {isCreatingMocks ? 'Creating...' : 'Create mock notifications'}
                </button>
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
                    className="p-4 text-center"
                  >
                    <button
                      onClick={loadMore}
                      disabled={isLoadingMore}
                      className="text-sm text-primary hover:text-primary/80 font-medium disabled:opacity-50"
                    >
                      {isLoadingMore ? 'Loading...' : 'Load more'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer with View all button */}
          <div
            className="shrink-0 border-t border-border-color-strong p-4"
          >
            <Button
              href="/account/activity"
              fullWidth
              onClick={() => setIsOpen(false)}
            >
              View all notifications
            </Button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
