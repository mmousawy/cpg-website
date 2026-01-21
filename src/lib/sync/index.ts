/**
 * Extensible Debounced Sync System
 *
 * Register handlers at app initialization, then use the hook or
 * direct queue functions throughout the app.
 *
 * @example
 * // In app layout or provider
 * import { initializeSyncHandlers } from '@/lib/sync';
 * initializeSyncHandlers();
 *
 * // In components
 * import { queueLike, queueNotificationSeen } from '@/lib/sync';
 * queueLike('photo', photoId, true);
 * queueNotificationSeen(notificationId);
 */

import { getQueryClient } from '@/lib/queryClient';
import { registerLikesHandler } from './handlers/likes';
import { registerNotificationsHandler } from './handlers/notifications';
import { syncRegistry } from './registry';

export { syncRegistry, initSyncRegistry } from './registry';
export type { SyncHandler, SyncAction, SyncRegistry, SyncCallback } from './types';

// Handler IDs for subscribing to sync success events
export const SYNC_HANDLER_IDS = {
  LIKES: 'likes',
  NOTIFICATIONS: 'notifications',
} as const;

// Handler exports
export { queueLike } from './handlers/likes';
export {
  queueNotificationSeen,
  queueNotificationDismiss,
  queueAllNotificationsSeen,
} from './handlers/notifications';

// Flag to prevent double initialization
let handlersInitialized = false;

/**
 * Initialize all sync handlers and register cache invalidation callbacks.
 * Call this once at app startup (e.g., in layout or provider).
 */
export function initializeSyncHandlers(): void {
  if (handlersInitialized) return;
  handlersInitialized = true;

  // Register handlers
  registerLikesHandler();
  registerNotificationsHandler();

  // Register global cache invalidation callbacks
  // These persist across navigation and work even when components are unmounted
  syncRegistry.onSyncSuccess(SYNC_HANDLER_IDS.LIKES, () => {
    const queryClient = getQueryClient();
    queryClient.invalidateQueries({ queryKey: ['photo-likes'] });
    queryClient.invalidateQueries({ queryKey: ['album-likes'] });
    queryClient.invalidateQueries({ queryKey: ['batch-photo-like-counts'] });
    queryClient.invalidateQueries({ queryKey: ['batch-album-like-counts'] });
  });

  syncRegistry.onSyncSuccess(SYNC_HANDLER_IDS.NOTIFICATIONS, () => {
    const queryClient = getQueryClient();
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  });
}
