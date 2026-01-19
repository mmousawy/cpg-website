'use client';

import { useEffect, useState, useCallback } from 'react';
import type { NotificationWithActor } from '@/types/notifications';
import { markNotificationAsSeen, markAllNotificationsAsSeen, dismissNotification as dismissNotificationAction } from '@/lib/actions/notifications';

const PAGE_SIZE = 20;

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<NotificationWithActor[]>([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/notifications?limit=${PAGE_SIZE}&offset=0`);
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnseenCount(data.unseenCount || 0);
      setTotalCount(data.totalCount || 0);
      setHasMore(data.hasMore || false);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Load more notifications
  const loadMore = useCallback(async () => {
    if (!userId || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const offset = notifications.length;
      const response = await fetch(`/api/notifications?limit=${PAGE_SIZE}&offset=${offset}`);
      if (!response.ok) {
        throw new Error('Failed to fetch more notifications');
      }
      const data = await response.json();
      setNotifications((prev) => [...prev, ...(data.notifications || [])]);
      setHasMore(data.hasMore || false);
    } catch (error) {
      console.error('Error loading more notifications:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [userId, isLoadingMore, hasMore, notifications.length]);

  // Initial fetch on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Listen for custom refresh events (e.g., when mocks are created from another component)
  useEffect(() => {
    const handleRefresh = () => {
      fetchNotifications();
    };

    window.addEventListener('notifications:refresh', handleRefresh);
    return () => {
      window.removeEventListener('notifications:refresh', handleRefresh);
    };
  }, [fetchNotifications]);

  // TODO: Supabase Realtime subscription is disabled due to SSR hydration issues
  // The notification button still updates via:
  // 1. Custom event system (notifications:refresh) - triggered by server actions
  // 2. Initial fetch on page load
  // 3. Manual refresh when needed
  // To re-enable Realtime, the postgres_changes subscription needs proper SSR handling

  const markAsSeen = useCallback(async (notificationId: string) => {
    const result = await markNotificationAsSeen(notificationId);
    if (result.success) {
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, seen_at: new Date().toISOString() } : notif,
        ),
      );
      setUnseenCount((prev) => Math.max(0, prev - 1));
    }
    return result;
  }, []);

  const markAllAsSeen = useCallback(async () => {
    const result = await markAllNotificationsAsSeen();
    if (result.success) {
      setNotifications((prev) => prev.map((notif) => ({ ...notif, seen_at: new Date().toISOString() })));
      setUnseenCount(0);
    }
    return result;
  }, []);

  const dismiss = useCallback(async (notificationId: string) => {
    // Optimistically remove from list
    const notification = notifications.find((n) => n.id === notificationId);
    const wasUnseen = notification && !notification.seen_at;

    setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
    setTotalCount((prev) => Math.max(0, prev - 1));
    if (wasUnseen) {
      setUnseenCount((prev) => Math.max(0, prev - 1));
    }

    const result = await dismissNotificationAction(notificationId);
    if (!result.success) {
      // Revert on error
      fetchNotifications();
    }
    return result;
  }, [notifications, fetchNotifications]);

  return {
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
    refresh: fetchNotifications,
  };
}
