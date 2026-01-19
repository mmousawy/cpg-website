'use client';

import PageContainer from '@/components/layout/PageContainer';
import NotificationItem from '@/components/notifications/NotificationItem';
import { createMockNotifications, dismissNotification, markAllNotificationsAsSeen, markNotificationAsSeen } from '@/lib/actions/notifications';
import type { NotificationWithActor } from '@/types/notifications';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import SadSVG from 'public/icons/sad.svg';
import { useCallback, useEffect, useState } from 'react';

dayjs.extend(relativeTime);

const PAGE_SIZE = 40;

type ActivityContentProps = {
  initialNotifications: NotificationWithActor[];
  initialTotalCount: number;
};

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

export default function ActivityContent({ initialNotifications, initialTotalCount }: ActivityContentProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [hasMore, setHasMore] = useState(initialNotifications.length < initialTotalCount);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [isCreatingMocks, setIsCreatingMocks] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Sync state with props when server data changes (e.g., after router.refresh())
  useEffect(() => {
    setNotifications(initialNotifications);
    setTotalCount(initialTotalCount);
    setHasMore(initialNotifications.length < initialTotalCount);
  }, [initialNotifications, initialTotalCount]);

  const groups = groupNotificationsByDate(notifications);
  const unseenCount = notifications.filter((n) => !n.seen_at).length;

  const handleView = useCallback(async (notificationId: string) => {
    // Optimistically mark as seen
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, seen_at: new Date().toISOString() } : notif,
      ),
    );

    // Notify other components to update their state without refetching
    window.dispatchEvent(new CustomEvent('notifications:mark-seen', {
      detail: { notificationId },
    }));

    await markNotificationAsSeen(notificationId);
  }, []);

  const handleDismiss = useCallback(async (notificationId: string) => {
    const notification = notifications.find((n) => n.id === notificationId);
    const wasUnseen = notification ? !notification.seen_at : false;

    // Optimistically remove from list and update total count
    setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
    setTotalCount((prev) => Math.max(0, prev - 1));

    // Notify other components to update their state without refetching
    window.dispatchEvent(new CustomEvent('notifications:dismiss', {
      detail: { notificationId, wasUnseen },
    }));

    await dismissNotification(notificationId);
  }, [notifications]);

  const handleMarkAsSeen = useCallback(async (notificationId: string) => {
    // Optimistically mark as seen in local state
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, seen_at: new Date().toISOString() } : notif,
      ),
    );

    // Notify other components to update their state without refetching
    window.dispatchEvent(new CustomEvent('notifications:mark-seen', {
      detail: { notificationId },
    }));

    await markNotificationAsSeen(notificationId);
  }, []);

  const handleMarkAllAsSeen = useCallback(async () => {
    setIsMarkingAll(true);
    const result = await markAllNotificationsAsSeen();
    if (result.success) {
      setNotifications((prev) => prev.map((notif) => ({ ...notif, seen_at: new Date().toISOString() })));
      // Notify other components to update their state without refetching
      window.dispatchEvent(new CustomEvent('notifications:mark-all-seen'));
    }
    setIsMarkingAll(false);
  }, []);

  const handleCreateMocks = useCallback(async () => {
    setIsCreatingMocks(true);
    try {
      await createMockNotifications();
      // Fetch fresh notifications from API since router.refresh() may not update state
      const response = await fetch(`/api/notifications?limit=${PAGE_SIZE}&offset=0`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setTotalCount(data.totalCount || 0);
        setHasMore(data.hasMore || false);
      }
      // Notify other components (e.g., NotificationButton) to refresh
      window.dispatchEvent(new CustomEvent('notifications:refresh'));
    } catch (error) {
      console.error('Error creating mock notifications:', error);
    } finally {
      setIsCreatingMocks(false);
    }
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const offset = notifications.length;
      const response = await fetch(`/api/notifications?limit=${PAGE_SIZE}&offset=${offset}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications((prev) => [...prev, ...(data.notifications || [])]);
        setHasMore(data.hasMore || false);
      } else {
        console.error('Error loading more notifications: response not ok', response.status);
      }
    } catch (error) {
      // Network errors (ETIMEDOUT, etc.) - fail silently, user can retry
      console.error('Error loading more notifications:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, notifications.length]);

  const hasNotifications = notifications.length > 0;

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
            {/* Dev-only mock button */}
            {process.env.NODE_ENV === 'development' && (
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
                disabled={isMarkingAll}
                className="text-sm text-primary hover:text-primary/80 font-medium disabled:opacity-50"
              >
                {isMarkingAll ? 'Marking...' : `Mark all as seen (${unseenCount})`}
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
          <button
            onClick={handleCreateMocks}
            disabled={isCreatingMocks}
            className="mt-6 text-sm text-primary hover:text-primary/80 font-medium disabled:opacity-50"
          >
            {isCreatingMocks ? 'Creating...' : 'Create mock notifications'}
          </button>
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
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="text-sm text-primary hover:text-primary/80 font-medium disabled:opacity-50"
              >
                {isLoadingMore ? 'Loading...' : `Load more (${totalCount - notifications.length} remaining)`}
              </button>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
