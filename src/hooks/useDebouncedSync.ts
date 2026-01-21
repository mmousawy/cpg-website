'use client';

import { useCallback, useEffect } from 'react';
import {
  initializeSyncHandlers,
  queueLike as queueLikeAction,
  queueNotificationSeen as queueNotificationSeenAction,
  queueNotificationDismiss as queueNotificationDismissAction,
  queueAllNotificationsSeen as queueAllNotificationsSeenAction,
} from '@/lib/sync';

/**
 * Hook for debounced database sync that persists across navigation.
 *
 * Features:
 * - Debounced syncing (1 second of inactivity)
 * - Batched notification updates
 * - Individual like syncs
 * - sendBeacon on page unload for reliable delivery
 * - Action superseding (dismiss > seen for notifications)
 *
 * The underlying sync system is extensible - new sync types can be added
 * by registering handlers in src/lib/sync/handlers/
 *
 * @example
 * const { queueLike, queueNotificationSeen } = useDebouncedSync();
 *
 * // Queue a like - syncs after 1s of inactivity
 * queueLike('photo', photoId, true);
 *
 * // Queue notification as seen - batches with other notification actions
 * queueNotificationSeen(notificationId);
 */
export function useDebouncedSync() {
  // Initialize sync handlers once
  useEffect(() => {
    initializeSyncHandlers();
  }, []);

  const queueLike = useCallback((
    entityType: 'photo' | 'album',
    entityId: string,
    liked: boolean,
  ) => {
    queueLikeAction(entityType, entityId, liked);
  }, []);

  const queueNotificationSeen = useCallback((notificationId: string) => {
    queueNotificationSeenAction(notificationId);
  }, []);

  const queueNotificationDismiss = useCallback((notificationId: string) => {
    queueNotificationDismissAction(notificationId);
  }, []);

  const queueAllNotificationsSeen = useCallback((notificationIds: string[]) => {
    queueAllNotificationsSeenAction(notificationIds);
  }, []);

  return {
    queueLike,
    queueNotificationSeen,
    queueNotificationDismiss,
    queueAllNotificationsSeen,
  };
}
