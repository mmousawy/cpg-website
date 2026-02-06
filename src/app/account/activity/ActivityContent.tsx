'use client';

import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/shared/Button';
import NotificationItem from '@/components/notifications/NotificationItem';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { createMockNotifications } from '@/lib/actions/notifications';
import type { NotificationWithActor } from '@/types/notifications';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import SadSVG from 'public/icons/sad.svg';
import { useCallback, useState } from 'react';

dayjs.extend(relativeTime);

const PAGE_SIZE = 40;

function groupNotificationsByDate(notifications: NotificationWithActor[]) {
  const groups: Record<string, NotificationWithActor[]> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    earlier: [],
  };

  const now = dayjs();
  const today = now.startOf('day');
  const yesterday = today.subtract(1, 'day');
  const weekAgo = today.subtract(7, 'days');

  notifications.forEach((notification) => {
    const date = dayjs(notification.created_at);

    if (date.isAfter(today)) {
      groups.today.push(notification);
    } else if (date.isAfter(yesterday)) {
      groups.yesterday.push(notification);
    } else if (date.isAfter(weekAgo)) {
      groups.thisWeek.push(notification);
    } else {
      groups.earlier.push(notification);
    }
  });

  return groups;
}

export default function ActivityContent() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [isCreatingMocks, setIsCreatingMocks] = useState(false);

  // Use the shared notifications hook with React Query
  const {
    notifications,
    unseenCount,
    totalCount,
    hasMore,
    isLoading,
    isLoadingMore,
    markAsSeen,
    markAllAsSeen,
    dismiss,
    loadMore,
    refresh,
  } = useNotifications(user?.id || null, { pageSize: PAGE_SIZE });

  const groups = groupNotificationsByDate(notifications);

  // Hook methods already dispatch events to sync other hook instances
  const handleView = useCallback((notificationId: string) => {
    markAsSeen(notificationId);
  }, [markAsSeen]);

  const handleDismiss = useCallback((notificationId: string) => {
    dismiss(notificationId);
  }, [dismiss]);

  const handleMarkAsSeen = useCallback((notificationId: string) => {
    markAsSeen(notificationId);
  }, [markAsSeen]);

  const handleMarkAllAsSeen = useCallback(() => {
    markAllAsSeen();
  }, [markAllAsSeen]);

  const handleCreateMocks = useCallback(async () => {
    setIsCreatingMocks(true);
    try {
      await createMockNotifications();
      // Refresh all notification queries
      refresh();
      window.dispatchEvent(new CustomEvent('notifications:refresh'));
    } catch (error) {
      console.error('Error creating mock notifications:', error);
    } finally {
      setIsCreatingMocks(false);
    }
  }, [refresh]);

  const hasNotifications = notifications.length > 0;

  if (isLoading) {
    return (
      <PageContainer>
        <div
          className="mb-8"
        >
          <h1
            className="text-3xl font-bold mb-2"
          >
            Activity
          </h1>
          <p
            className="text-base sm:text-lg opacity-70"
          >
            View your notifications and activity
          </p>
        </div>
        <div
          className="rounded-xl border border-border-color bg-background-light p-8 text-center"
        >
          <div
            className="animate-pulse text-foreground/40"
          >
            Loading notifications...
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div
        className="mb-8"
      >
        <div
          className="flex items-center justify-between mb-2"
        >
          <h1
            className="text-3xl font-bold"
          >
            Activity
          </h1>
          <div
            className="flex items-center gap-4"
          >
            {/* Admin-only mock button */}
            {isAdmin && (
              <button
                onClick={handleCreateMocks}
                disabled={isCreatingMocks}
                className="text-sm text-foreground/50 hover:text-foreground/70 font-medium disabled:opacity-50"
              >
                {isCreatingMocks ? 'Adding...' : '+ Add mock'}
              </button>
            )}
            {hasNotifications && unseenCount > 0 && (
              <button
                onClick={handleMarkAllAsSeen}
                className="text-sm text-primary hover:text-primary/80 font-medium"
              >
                Mark all as seen (
                {unseenCount}
                )
              </button>
            )}
          </div>
        </div>
        <p
          className="text-base sm:text-lg opacity-70"
        >
          View your notifications and activity
        </p>
      </div>

      {!hasNotifications ? (
        <div
          className="rounded-xl border border-border-color bg-background-light p-8 text-center"
        >
          <div
            className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10"
          >
            <SadSVG
              className="size-8 fill-primary"
            />
          </div>
          <h2
            className="mb-2 text-xl font-semibold"
          >
            No activity yet
          </h2>
          <p
            className="text-foreground/70"
          >
            Your notifications and activity will appear here
          </p>
          {isAdmin && (
            <button
              onClick={handleCreateMocks}
              disabled={isCreatingMocks}
              className="mt-6 text-sm text-primary hover:text-primary/80 font-medium disabled:opacity-50"
            >
              {isCreatingMocks ? 'Creating...' : 'Create mock notifications'}
            </button>
          )}
        </div>
      ) : (
        <div
          className="space-y-8"
        >
          {groups.today.length > 0 && (
            <section>
              <h2
                className="mb-3 text-lg font-semibold"
              >
                Today
              </h2>
              <div
                className="rounded-xl border border-border-color bg-background-light overflow-hidden divide-y divide-border-color"
              >
                {groups.today.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onView={handleView}
                    onDismiss={handleDismiss}
                    onMarkAsSeen={handleMarkAsSeen}
                    showDismiss
                  />
                ))}
              </div>
            </section>
          )}

          {groups.yesterday.length > 0 && (
            <section>
              <h2
                className="mb-3 text-lg font-semibold"
              >
                Yesterday
              </h2>
              <div
                className="rounded-xl border border-border-color bg-background-light overflow-hidden divide-y divide-border-color"
              >
                {groups.yesterday.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onView={handleView}
                    onDismiss={handleDismiss}
                    onMarkAsSeen={handleMarkAsSeen}
                    showDismiss
                  />
                ))}
              </div>
            </section>
          )}

          {groups.thisWeek.length > 0 && (
            <section>
              <h2
                className="mb-3 text-lg font-semibold"
              >
                This week
              </h2>
              <div
                className="rounded-xl border border-border-color bg-background-light overflow-hidden divide-y divide-border-color"
              >
                {groups.thisWeek.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onView={handleView}
                    onDismiss={handleDismiss}
                    onMarkAsSeen={handleMarkAsSeen}
                    showDismiss
                  />
                ))}
              </div>
            </section>
          )}

          {groups.earlier.length > 0 && (
            <section>
              <h2
                className="mb-3 text-lg font-semibold"
              >
                Earlier
              </h2>
              <div
                className="rounded-xl border border-border-color bg-background-light overflow-hidden divide-y divide-border-color"
              >
                {groups.earlier.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onView={handleView}
                    onDismiss={handleDismiss}
                    onMarkAsSeen={handleMarkAsSeen}
                    showDismiss
                  />
                ))}
              </div>
            </section>
          )}

          {/* Load more button */}
          {hasMore && (
            <div
              className="text-center"
            >
              <Button
                onClick={loadMore}
                loading={isLoadingMore}
                variant="ghost"
                size="sm"
              >
                {isLoadingMore ? 'Loading...' : `Load more (${totalCount - notifications.length} remaining)`}
              </Button>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
