import type { SyncAction, SyncCallback, SyncHandler, SyncRegistry } from './types';

const DEFAULT_DEBOUNCE_MS = 2000;

// Global state that persists across component mounts/unmounts and navigation
const handlers = new Map<string, SyncHandler<unknown, unknown>>();
const pendingActions = new Map<string, SyncAction<unknown>>();
const successCallbacks = new Map<string, Set<SyncCallback>>();
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let isSyncing = false;
let isInitialized = false;

/**
 * Invoke all registered success callbacks for a handler
 */
function invokeSuccessCallbacks(handlerId: string): void {
  const callbacks = successCallbacks.get(handlerId);
  if (callbacks) {
    callbacks.forEach((cb) => {
      try {
        cb();
      } catch (error) {
        console.error(`Error in sync success callback for ${handlerId}:`, error);
      }
    });
  }
}

/**
 * Generate a unique key for an action (combines handler id with payload key)
 */
function getActionKey(handlerId: string, payloadKey: string): string {
  return `${handlerId}:${payloadKey}`;
}

/**
 * Execute sync for all pending actions
 */
async function syncToServer(): Promise<void> {
  if (pendingActions.size === 0 || isSyncing) {
    return;
  }

  isSyncing = true;

  // Grab current actions and clear
  const actions = Array.from(pendingActions.values());
  pendingActions.clear();

  // Group actions by handler
  const actionsByHandler = new Map<string, SyncAction<unknown>[]>();
  for (const action of actions) {
    const existing = actionsByHandler.get(action.handlerId) || [];
    existing.push(action);
    actionsByHandler.set(action.handlerId, existing);
  }

  // Process each handler's actions
  const promises: Promise<void>[] = [];

  for (const [handlerId, handlerActions] of actionsByHandler) {
    const handler = handlers.get(handlerId);
    if (!handler) {
      console.warn(`No handler registered for: ${handlerId}`);
      continue;
    }

    if (handler.batch === 'individual') {
      // Sync each action individually
      for (const action of handlerActions) {
        promises.push(
          handler.sync(action.payload)
            .then(() => {
              handler.onSuccess?.();
              invokeSuccessCallbacks(handlerId);
            })
            .catch((error) => {
              console.error(`Sync failed for ${handlerId}:`, error);
              handler.onError?.(error);
              // Re-queue for retry
              const key = getActionKey(handlerId, handler.getKey(action.payload));
              pendingActions.set(key, action);
            }),
        );
      }
    } else {
      // Batch sync - group payloads
      const payloads = handlerActions.map((a) => a.payload);
      const grouped = handler.groupPayloads
        ? handler.groupPayloads(payloads)
        : payloads;

      promises.push(
        handler.sync(grouped)
          .then(() => {
            handler.onSuccess?.();
            invokeSuccessCallbacks(handlerId);
          })
          .catch((error) => {
            console.error(`Batch sync failed for ${handlerId}:`, error);
            handler.onError?.(error);
            // Re-queue all for retry
            for (const action of handlerActions) {
              const key = getActionKey(handlerId, handler.getKey(action.payload));
              pendingActions.set(key, action);
            }
          }),
      );
    }
  }

  await Promise.all(promises);

  isSyncing = false;

  // If new actions were added during processing, schedule another sync
  if (pendingActions.size > 0) {
    scheduleSync();
  }
}

/**
 * Schedule a debounced sync
 */
function scheduleSync(debounceMs: number = DEFAULT_DEBOUNCE_MS): void {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }
  syncTimeout = setTimeout(() => {
    syncTimeout = null;
    syncToServer();
  }, debounceMs);
}

/**
 * Flush all pending actions using sendBeacon (for page unload)
 */
function flushWithBeacon(): void {
  if (pendingActions.size === 0) return;

  // Group actions by handler
  const actionsByHandler = new Map<string, SyncAction<unknown>[]>();
  for (const action of pendingActions.values()) {
    const existing = actionsByHandler.get(action.handlerId) || [];
    existing.push(action);
    actionsByHandler.set(action.handlerId, existing);
  }

  // Send beacons for each handler
  for (const [handlerId, handlerActions] of actionsByHandler) {
    const handler = handlers.get(handlerId);
    if (!handler?.beaconSync) continue;

    if (handler.batch === 'individual') {
      for (const action of handlerActions) {
        handler.beaconSync(action.payload);
      }
    } else {
      const payloads = handlerActions.map((a) => a.payload);
      const grouped = handler.groupPayloads
        ? handler.groupPayloads(payloads)
        : payloads;
      handler.beaconSync(grouped);
    }
  }

  pendingActions.clear();
}

/**
 * Initialize global event listeners (once)
 */
function initGlobalListeners(): void {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  // Handle page unload - use sendBeacon for reliable delivery
  window.addEventListener('beforeunload', () => {
    if (syncTimeout) {
      clearTimeout(syncTimeout);
      syncTimeout = null;
    }
    flushWithBeacon();
  });

  // Handle tab becoming hidden - flush immediately
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && pendingActions.size > 0) {
      if (syncTimeout) {
        clearTimeout(syncTimeout);
        syncTimeout = null;
      }
      flushWithBeacon();
    }
  });
}

/**
 * The global sync registry
 */
export const syncRegistry: SyncRegistry = {
  register<TPayload, TBatched = TPayload[]>(
    handler: SyncHandler<TPayload, TBatched>,
  ): void {
    handlers.set(handler.id, handler as SyncHandler<unknown, unknown>);
    // Initialize listeners on first registration
    initGlobalListeners();
  },

  unregister(handlerId: string): void {
    handlers.delete(handlerId);
  },

  queue<TPayload>(handlerId: string, payload: TPayload, priority?: number): void {
    const handler = handlers.get(handlerId);
    if (!handler) {
      console.warn(`No handler registered for: ${handlerId}. Did you forget to register it?`);
      return;
    }

    const payloadKey = handler.getKey(payload);
    const key = getActionKey(handlerId, payloadKey);
    const actionPriority = priority ?? handler.priority ?? 0;

    // Check if there's an existing action with higher priority
    const existing = pendingActions.get(key);
    if (existing && existing.priority > actionPriority) {
      // Higher priority action already queued, skip this one
      return;
    }

    pendingActions.set(key, {
      handlerId,
      key,
      payload,
      timestamp: Date.now(),
      priority: actionPriority,
    });

    scheduleSync(handler.debounceMs ?? DEFAULT_DEBOUNCE_MS);
  },

  hasPending(handlerId: string): boolean {
    for (const action of pendingActions.values()) {
      if (action.handlerId === handlerId) return true;
    }
    return false;
  },

  async flush(): Promise<void> {
    if (syncTimeout) {
      clearTimeout(syncTimeout);
      syncTimeout = null;
    }
    await syncToServer();
  },

  getPendingCount(): number {
    return pendingActions.size;
  },

  onSyncSuccess(handlerId: string, callback: SyncCallback): () => void {
    if (!successCallbacks.has(handlerId)) {
      successCallbacks.set(handlerId, new Set());
    }
    successCallbacks.get(handlerId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = successCallbacks.get(handlerId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          successCallbacks.delete(handlerId);
        }
      }
    };
  },
};

/**
 * Initialize the registry (call once at app startup)
 */
export function initSyncRegistry(): void {
  initGlobalListeners();
}
