'use client';

import clsx from 'clsx';
import { useLayoutEffect, useState } from 'react';

import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { useMounted } from '@/hooks/useMounted';
import { useNotifications } from '@/hooks/useNotifications';
import { createMockNotifications } from '@/lib/actions/notifications';
import { subscribeRouteChange } from '@/lib/routeChange';
import BottomSheet from '../shared/BottomSheet';
import Button from '../shared/Button';
import NotificationItem from './NotificationItem';

type NotificationsSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function NotificationsSheet({ isOpen, onClose }: NotificationsSheetProps) {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [isCreatingMocks, setIsCreatingMocks] = useState(false);

  const {
    notifications,
    hasMore,
    isLoading,
    isLoadingMore,
    markAsSeen,
    loadMore,
  } = useNotifications(user?.id || null);

  useLayoutEffect(() => {
    return subscribeRouteChange(() => {
      onClose();
    });
  }, [onClose]);

  const handleView = async (notificationId: string) => {
    await markAsSeen(notificationId);
    onClose();
  };

  const handleCreateMocks = async () => {
    setIsCreatingMocks(true);
    try {
      await createMockNotifications();
      window.dispatchEvent(new CustomEvent('notifications:refresh'));
    } catch (error) {
      console.error('Error creating mock notifications:', error);
    } finally {
      setIsCreatingMocks(false);
    }
  };

  if (!user) return null;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Notifications"
      maxHeight={80}
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="animate-pulse text-foreground/40">Loading...</div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 px-6">
              <div className="mb-4 rounded-full bg-primary/10 p-4">
                <svg className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                </svg>
              </div>
              <p className="text-foreground/80 font-medium mb-1">All caught up!</p>
              <p className="text-sm text-foreground/50 text-center mb-4">
                New notifications will appear here
              </p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleCreateMocks}
                  disabled={isCreatingMocks}
                  className="text-sm text-primary hover:text-primary/80 font-medium disabled:opacity-50"
                >
                  {isCreatingMocks ? 'Creating...' : 'Create mock notifications'}
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border-color">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onView={handleView}
                />
              ))}
              {hasMore && (
                <div className="p-4 text-center">
                  <button
                    type="button"
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

        <div className="shrink-0 border-t border-border-color-strong p-4">
          <Button href="/account/activity" fullWidth onClick={onClose}>
            View all activity
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}

/** Hook for notification badge count on mobile avatar */
export function useNotificationBadge() {
  const { user } = useAuth();
  const mounted = useMounted();
  const { unseenCount } = useNotifications(user?.id || null);

  return {
    showBadge: Boolean(user && mounted),
    unseenCount,
    notificationAriaLabel:
      unseenCount > 0
        ? `${unseenCount} unread notification${unseenCount === 1 ? '' : 's'}`
        : 'Notifications',
  };
}

export function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span
      className={clsx(
        'absolute -top-0.5 -right-0.5 bg-red-700 text-white text-[9px] font-medium',
        'rounded-full min-w-3.5 h-3.5 flex items-center justify-center px-0.5',
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
