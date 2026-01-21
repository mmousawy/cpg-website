import { syncRegistry } from '../registry';
import type { SyncHandler } from '../types';

export type NotificationAction = 'mark_seen' | 'dismiss';

export type NotificationPayload = {
  id: string;
  action: NotificationAction;
};

export type NotificationBatchPayload = {
  updates: NotificationPayload[];
};

// Priority constants - higher number = higher priority
const PRIORITY = {
  MARK_SEEN: 0,
  DISMISS: 1, // Dismiss supersedes mark_seen
} as const;

/**
 * Notifications sync handler
 *
 * - Batched syncing (multiple notifications in one request)
 * - Dismiss supersedes mark_seen for the same notification
 * - Cache invalidation handled via syncRegistry.onSyncSuccess() callbacks
 */
export const notificationsHandler: SyncHandler<NotificationPayload, NotificationBatchPayload> = {
  id: 'notifications',

  getKey: (payload) => payload.id,

  batch: 'grouped',

  groupPayloads: (payloads) => ({ updates: payloads }),

  sync: async (data) => {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to sync notifications: ${response.status}`);
    }
  },

  beaconSync: (data) => {
    navigator.sendBeacon('/api/notifications', JSON.stringify(data));
  },
};

/**
 * Register the notifications handler
 */
export function registerNotificationsHandler(): void {
  syncRegistry.register(notificationsHandler);
}

/**
 * Queue a notification seen action for debounced sync
 */
export function queueNotificationSeen(notificationId: string): void {
  syncRegistry.queue<NotificationPayload>(
    'notifications',
    { id: notificationId, action: 'mark_seen' },
    PRIORITY.MARK_SEEN,
  );
}

/**
 * Queue a notification dismiss action for debounced sync
 */
export function queueNotificationDismiss(notificationId: string): void {
  syncRegistry.queue<NotificationPayload>(
    'notifications',
    { id: notificationId, action: 'dismiss' },
    PRIORITY.DISMISS,
  );
}

/**
 * Queue multiple notification seen actions
 */
export function queueAllNotificationsSeen(notificationIds: string[]): void {
  for (const id of notificationIds) {
    queueNotificationSeen(id);
  }
}
