'use client';

import { dismissNotification as dismissNotificationAction, markAllNotificationsAsSeen, markNotificationAsSeen } from '@/lib/actions/notifications';
import type { NotificationWithActor } from '@/types/notifications';
import { useCallback, useEffect, useState } from 'react';

const PAGE_SIZE = 20;

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<NotificationWithActor[]>([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Fetch notifications from API
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

  // Load more notifications (pagination)
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

  // Listen for refresh events (triggered by Realtime or other components)
  useEffect(() => {
    const handleRefresh = () => {
      fetchNotifications();
    };

    window.addEventListener('notifications:refresh', handleRefresh);
    return () => {
      window.removeEventListener('notifications:refresh', handleRefresh);
    };
  }, [fetchNotifications]);

  // Listen for optimistic updates from other components (e.g., ActivityContent)
  useEffect(() => {
    const handleMarkAsSeen = (event: CustomEvent<{ notificationId: string }>) => {
      const { notificationId } = event.detail;
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, seen_at: new Date().toISOString() } : notif,
        ),
      );
      setUnseenCount((prev) => Math.max(0, prev - 1));
    };

    const handleDismiss = (event: CustomEvent<{ notificationId: string; wasUnseen: boolean }>) => {
      const { notificationId, wasUnseen } = event.detail;
      setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
      setTotalCount((prev) => Math.max(0, prev - 1));
      if (wasUnseen) {
        setUnseenCount((prev) => Math.max(0, prev - 1));
      }
    };

    const handleMarkAllAsSeen = () => {
      setNotifications((prev) => prev.map((notif) => ({ ...notif, seen_at: new Date().toISOString() })));
      setUnseenCount(0);
    };

    window.addEventListener('notifications:mark-seen', handleMarkAsSeen as EventListener);
    window.addEventListener('notifications:dismiss', handleDismiss as EventListener);
    window.addEventListener('notifications:mark-all-seen', handleMarkAllAsSeen);

    return () => {
      window.removeEventListener('notifications:mark-seen', handleMarkAsSeen as EventListener);
      window.removeEventListener('notifications:dismiss', handleDismiss as EventListener);
      window.removeEventListener('notifications:mark-all-seen', handleMarkAllAsSeen);
    };
  }, []);

  // Mark single notification as seen
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

  // Mark all notifications as seen
  const markAllAsSeen = useCallback(async () => {
    const result = await markAllNotificationsAsSeen();
    if (result.success) {
      setNotifications((prev) => prev.map((notif) => ({ ...notif, seen_at: new Date().toISOString() })));
      setUnseenCount(0);
    }
    return result;
  }, []);

  // Dismiss a notification
  const dismiss = useCallback(async (notificationId: string) => {
    const notification = notifications.find((n) => n.id === notificationId);
    const wasUnseen = notification && !notification.seen_at;

    // Optimistic update
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
