import { syncRegistry } from '../registry';
import type { SyncHandler } from '../types';

export type LikePayload = {
  entityType: 'photo' | 'album';
  entityId: string;
  liked: boolean;
};

/**
 * Likes sync handler
 *
 * - Individual syncing (not batched) since each like needs separate processing
 * - Uses sendBeacon on page unload for reliability
 * - Cache invalidation handled via syncRegistry.onSyncSuccess() callbacks
 */
export const likesHandler: SyncHandler<LikePayload> = {
  id: 'likes',

  getKey: (payload) => `${payload.entityType}:${payload.entityId}`,

  batch: 'individual',

  sync: async (payload) => {
    const response = await fetch('/api/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to sync like: ${response.status}`);
    }
  },

  beaconSync: (payload) => {
    navigator.sendBeacon('/api/likes', JSON.stringify(payload));
  },
};

/**
 * Register the likes handler
 */
export function registerLikesHandler(): void {
  syncRegistry.register(likesHandler);
}

/**
 * Queue a like action for debounced sync
 */
export function queueLike(
  entityType: 'photo' | 'album',
  entityId: string,
  liked: boolean,
): void {
  syncRegistry.queue<LikePayload>('likes', { entityType, entityId, liked });
}
