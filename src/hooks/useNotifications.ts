'use client';

import type { NotificationWithActor } from '@/types/notifications';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  queueNotificationSeen,
  queueNotificationDismiss,
  queueAllNotificationsSeen,
} from '@/lib/sync';
import { useCallback, useEffect, useState } from 'react';

const DEFAULT_PAGE_SIZE = 20;

type NotificationsData = {
  notifications: NotificationWithActor[];
  unseenCount: number;
  totalCount: number;
  hasMore: boolean;
};

async function fetchNotificationsData(pageSize: number): Promise<NotificationsData> {
  const response = await fetch(`/api/notifications?limit=${pageSize}&offset=0`);
  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }
  const data = await response.json();
  return {
    notifications: data.notifications || [],
    unseenCount: data.unseenCount || 0,
    totalCount: data.totalCount || 0,
    hasMore: data.hasMore || false,
  };
}

type UseNotificationsOptions = {
  pageSize?: number;
};

export function useNotifications(userId: string | null, options?: UseNotificationsOptions) {
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const queryClient = useQueryClient();

  // Get cached data to initialize state (prevents flash of stale data on navigation)
  const queryKey = ['notifications', userId, pageSize];
  const cachedData = queryClient.getQueryData<NotificationsData>(queryKey);

  // Use React Query for notifications data
  // staleTime of 30s means it won't refetch on every render
  // refetchOnWindowFocus disabled to prevent unwanted fetches
  const query = useQuery({
    queryKey,
    queryFn: () => fetchNotificationsData(pageSize),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  // Local state for optimistic updates - initialize from cache if available
  const [notifications, setNotifications] = useState<NotificationWithActor[]>(cachedData?.notifications ?? []);
  const [unseenCount, setUnseenCount] = useState(cachedData?.unseenCount ?? 0);
  const [totalCount, setTotalCount] = useState(cachedData?.totalCount ?? 0);
  const [hasMore, setHasMore] = useState(cachedData?.hasMore ?? false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Sync local state from query data
  useEffect(() => {
    if (query.data) {
      setNotifications(query.data.notifications);
      setUnseenCount(query.data.unseenCount);
      setTotalCount(query.data.totalCount);
      setHasMore(query.data.hasMore);
    }
  }, [query.data]);

  // Load more notifications (pagination)
  const loadMore = useCallback(async () => {
    if (!userId || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const offset = notifications.length;
      const response = await fetch(`/api/notifications?limit=${pageSize}&offset=${offset}`);
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
  }, [userId, isLoadingMore, hasMore, notifications.length, pageSize]);

  // Listen for refresh events (triggered by Realtime or other components)
  useEffect(() => {
    const handleRefresh = () => {
      // Invalidate all notification queries for this user (regardless of pageSize)
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    };

    window.addEventListener('notifications:refresh', handleRefresh);
    return () => {
      window.removeEventListener('notifications:refresh', handleRefresh);
    };
  }, [queryClient, userId]);

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
  const markAsSeen = useCallback((notificationId: string) => {
    // Optimistically update local state
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, seen_at: new Date().toISOString() } : notif,
      ),
    );
    setUnseenCount((prev) => Math.max(0, prev - 1));

    // Notify other hook instances to update their state
    window.dispatchEvent(new CustomEvent('notifications:mark-seen', {
      detail: { notificationId },
    }));

    // Queue for debounced sync (persists across navigation)
    queueNotificationSeen(notificationId);

    return { success: true };
  }, []);

  // Mark all notifications as seen
  const markAllAsSeen = useCallback(() => {
    // Get IDs of all unseen notifications
    const unseenIds = notifications.filter((n) => !n.seen_at).map((n) => n.id);

    // Optimistically update local state
    setNotifications((prev) => prev.map((notif) => ({ ...notif, seen_at: new Date().toISOString() })));
    setUnseenCount(0);

    // Notify other hook instances to update their state
    window.dispatchEvent(new CustomEvent('notifications:mark-all-seen'));

    // Queue all unseen for debounced sync (persists across navigation)
    queueAllNotificationsSeen(unseenIds);

    return { success: true };
  }, [notifications]);

  // Dismiss a notification
  const dismiss = useCallback((notificationId: string) => {
    const notification = notifications.find((n) => n.id === notificationId);
    const wasUnseen = notification && !notification.seen_at;

    // Optimistic update
    setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
    setTotalCount((prev) => Math.max(0, prev - 1));
    if (wasUnseen) {
      setUnseenCount((prev) => Math.max(0, prev - 1));
    }

    // Notify other hook instances to update their state
    window.dispatchEvent(new CustomEvent('notifications:dismiss', {
      detail: { notificationId, wasUnseen },
    }));

    // Queue for debounced sync (persists across navigation)
    queueNotificationDismiss(notificationId);

    return { success: true };
  }, [notifications]);

  // Invalidate query (for external use)
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
  }, [queryClient, userId]);

  return {
    notifications,
    unseenCount,
    totalCount,
    hasMore,
    isLoading: query.isLoading,
    isLoadingMore,
    markAsSeen,
    markAllAsSeen,
    dismiss,
    loadMore,
    refresh: invalidate,
  };
}
