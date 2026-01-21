/**
 * Extensible Debounced Sync System
 *
 * A registry-based system for debounced database syncs that:
 * - Persists across client-side navigation
 * - Supports individual or batched syncing
 * - Uses sendBeacon for reliable delivery on page unload
 * - Allows action superseding (e.g., dismiss > seen)
 */

/**
 * Base sync action stored in the pending queue
 */
export type SyncAction<TPayload = unknown> = {
  handlerId: string;
  key: string;
  payload: TPayload;
  timestamp: number;
  priority: number;
};

/**
 * Configuration for a sync handler
 *
 * @template TPayload - The shape of individual action payloads
 * @template TBatched - The shape of batched payloads (for batch: 'grouped')
 */
export type SyncHandler<TPayload = unknown, TBatched = unknown> = {
  /** Unique identifier for this handler */
  id: string;

  /**
   * Generate a deduplication key from payload.
   * Actions with the same key will be deduplicated based on priority.
   */
  getKey: (payload: TPayload) => string;

  /**
   * Batching strategy:
   * - 'individual': Each action synced separately
   * - 'grouped': Actions batched into single request
   */
  batch: 'individual' | 'grouped';

  /**
   * Transform multiple payloads into a single batched payload.
   * Required when batch is 'grouped'.
   */
  groupPayloads?: (payloads: TPayload[]) => TBatched;

  /**
   * Sync function - sends data to the server.
   * For 'individual' batch mode, receives TPayload.
   * For 'grouped' batch mode, receives TBatched.
   */
  sync: (data: TPayload | TBatched) => Promise<void>;

  /**
   * Beacon sync for page unload - must be synchronous.
   * Uses navigator.sendBeacon for reliable delivery.
   */
  beaconSync?: (data: TPayload | TBatched) => void;

  /**
   * Called after successful sync.
   * Use for cache invalidation, event dispatch, etc.
   */
  onSuccess?: () => void;

  /**
   * Called on sync failure (after all retries exhausted).
   */
  onError?: (error: unknown) => void;

  /**
   * Priority for deduplication.
   * Higher priority actions supersede lower priority for same key.
   * Default: 0
   */
  priority?: number;

  /**
   * Debounce delay in milliseconds.
   * Default: uses global DEBOUNCE_MS (1000ms)
   */
  debounceMs?: number;
};

/**
 * Callback for post-sync cache invalidation
 */
export type SyncCallback = () => void;

/**
 * Registry API for managing sync handlers
 */
export type SyncRegistry = {
  /**
   * Register a new sync handler.
   * Overwrites existing handler with same id.
   */
  register: <TPayload, TBatched = TPayload[]>(
    handler: SyncHandler<TPayload, TBatched>
  ) => void;

  /**
   * Unregister a handler by id.
   */
  unregister: (handlerId: string) => void;

  /**
   * Queue an action for debounced sync.
   */
  queue: <TPayload>(handlerId: string, payload: TPayload, priority?: number) => void;

  /**
   * Check if there are pending syncs for a handler.
   */
  hasPending: (handlerId: string) => boolean;

  /**
   * Force immediate sync of all pending actions.
   */
  flush: () => Promise<void>;

  /**
   * Get count of pending actions.
   */
  getPendingCount: () => number;

  /**
   * Subscribe to sync success events for a handler.
   * Returns an unsubscribe function.
   * Callbacks persist across navigation (global).
   */
  onSyncSuccess: (handlerId: string, callback: SyncCallback) => () => void;
};
