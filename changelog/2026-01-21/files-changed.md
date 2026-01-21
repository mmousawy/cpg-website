# Files Changed - Extensible Debounced Sync System

## Overview

Refactored the debounced sync system into an extensible, registry-based architecture with global cache invalidation that works reliably across client-side navigation.

## Problem Solved

Previously, when users performed actions (likes, notification dismissals) and navigated away before the debounced sync completed:
1. The sync would complete in the background
2. But React Query cache wouldn't be invalidated (component unmounted)
3. Navigating back showed stale data

The new system ensures cache invalidation happens globally, regardless of component lifecycle.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Sync Registry (Global)                    │
├─────────────────────────────────────────────────────────────┤
│  handlers: Map<handlerId, SyncHandler>                       │
│  pendingActions: Map<actionKey, SyncAction>                  │
│  successCallbacks: Map<handlerId, Set<Callback>>             │
├─────────────────────────────────────────────────────────────┤
│  register(handler) - Add a sync handler                      │
│  queue(handlerId, payload) - Queue action for debounced sync │
│  onSyncSuccess(handlerId, callback) - Subscribe to success   │
│  flush() - Force immediate sync                              │
│  hasPending(handlerId) - Check for pending actions           │
└─────────────────────────────────────────────────────────────┘
          │                                    │
          ▼                                    ▼
┌─────────────────────┐            ┌─────────────────────┐
│   Likes Handler     │            │ Notifications Handler│
├─────────────────────┤            ├─────────────────────┤
│ batch: 'individual' │            │ batch: 'grouped'     │
│ debounce: 1000ms    │            │ debounce: 1000ms     │
│ sync: POST /api/likes│           │ sync: POST /api/notif│
│ beaconSync: sendBeacon│          │ beaconSync: sendBeacon│
└─────────────────────┘            └─────────────────────┘
```

## Features Implemented

### 1. Sync Registry

**File: `src/lib/sync/registry.ts`**

Global registry that manages:
- Handler registration
- Pending action queue with deduplication
- Debounced sync scheduling
- Priority-based action superseding
- Success callback invocation
- sendBeacon for page unload

```typescript
export const syncRegistry: SyncRegistry = {
  register(handler) { ... },
  queue(handlerId, payload, priority) { ... },
  onSyncSuccess(handlerId, callback) { ... },
  hasPending(handlerId) { ... },
  flush() { ... },
  getPendingCount() { ... },
};
```

### 2. Type Definitions

**File: `src/lib/sync/types.ts`**

```typescript
export type SyncHandler<TPayload, TBatched> = {
  id: string;
  getKey: (payload: TPayload) => string;
  batch: 'individual' | 'grouped';
  groupPayloads?: (payloads: TPayload[]) => TBatched;
  sync: (data: TPayload | TBatched) => Promise<void>;
  beaconSync?: (data: TPayload | TBatched) => void;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
  priority?: number;
  debounceMs?: number;
};

export type SyncCallback = () => void;
```

### 3. Likes Handler

**File: `src/lib/sync/handlers/likes.ts`**

- Individual sync (each like synced separately)
- Key: `${entityType}:${entityId}`
- Uses sendBeacon on page unload

```typescript
export const likesHandler: SyncHandler<LikePayload> = {
  id: 'likes',
  getKey: (payload) => `${payload.entityType}:${payload.entityId}`,
  batch: 'individual',
  sync: async (payload) => { /* POST /api/likes */ },
  beaconSync: (payload) => { navigator.sendBeacon('/api/likes', ...) },
};
```

### 4. Notifications Handler

**File: `src/lib/sync/handlers/notifications.ts`**

- Grouped sync (batch multiple actions)
- Priority system: dismiss (1) > mark_seen (0)
- Key: notification ID

```typescript
export const notificationsHandler: SyncHandler<NotificationPayload, NotificationBatchPayload> = {
  id: 'notifications',
  getKey: (payload) => payload.id,
  batch: 'grouped',
  groupPayloads: (payloads) => ({ updates: payloads }),
  sync: async (data) => { /* POST /api/notifications */ },
  beaconSync: (data) => { navigator.sendBeacon('/api/notifications', ...) },
};
```

### 5. Global Cache Invalidation

**File: `src/lib/sync/index.ts`**

Registers handlers AND cache invalidation callbacks at app startup:

```typescript
export function initializeSyncHandlers(): void {
  registerLikesHandler();
  registerNotificationsHandler();

  // Global cache invalidation - persists across navigation
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
```

### 6. Singleton QueryClient

**File: `src/lib/queryClient.ts`**

```typescript
let queryClient: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (!queryClient) {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000,
          gcTime: 10 * 60 * 1000,
          refetchOnWindowFocus: false,
          retry: 1,
        },
      },
    });
  }
  return queryClient;
}
```

### 7. Updated DetailLikesSection

**File: `src/components/shared/DetailLikesSection.tsx`**

- Initialize local state from React Query cache
- Prevents flash of stale data on navigation
- Optimistic UI with user avatar injection

```typescript
const queryKey = entityType === 'photo' ? ['photo-likes', entityId] : ['album-likes', entityId];
const cachedData = queryClient.getQueryData<{ likes: unknown[]; count: number; userHasLiked: boolean }>(queryKey);

const [liked, setLiked] = useState(cachedData?.userHasLiked ?? false);
const [count, setCount] = useState(cachedData?.count ?? initialCount);
```

## How It Works

### Sync Flow

1. User clicks like → `queueLike('photo', photoId, true)`
2. Registry stores action with key `likes:photo:${photoId}`
3. Debounce timer starts (1 second)
4. User navigates away → component unmounts (but registry persists)
5. Timer fires → `syncToServer()` called
6. POST request sent → success
7. `invokeSuccessCallbacks('likes')` called
8. Global callback invalidates React Query cache
9. User navigates back → stale query refetches → fresh data shown

### Page Unload Flow

1. User has pending sync
2. User closes tab/navigates to external site
3. `beforeunload` event fires
4. `flushWithBeacon()` called
5. `navigator.sendBeacon()` sends data reliably

### Priority System

For notifications, dismiss supersedes mark_seen:
- User marks notification as seen (priority 0)
- User then dismisses same notification (priority 1)
- Only dismiss action is synced (higher priority wins)

## All Modified Files (12 total)

### New Files (6)
- `src/lib/sync/types.ts` - Type definitions
- `src/lib/sync/registry.ts` - Core registry implementation
- `src/lib/sync/handlers/likes.ts` - Like sync handler
- `src/lib/sync/handlers/notifications.ts` - Notification sync handler
- `src/lib/sync/index.ts` - Public API and initialization
- `src/lib/queryClient.ts` - Singleton QueryClient

### Modified Files (6)
- `src/app/providers/QueryProvider.tsx` - Use singleton getQueryClient()
- `src/hooks/useDebouncedSync.ts` - Thin wrapper around sync registry
- `src/hooks/useLikes.ts` - Remove event listeners (handled by registry)
- `src/hooks/useNotifications.ts` - Initialize state from cache
- `src/components/shared/DetailLikesSection.tsx` - Cache init, optimistic UI
- `src/app/account/activity/ActivityContent.tsx` - Use useNotifications hook

## Testing Scenarios

### Like Persistence
1. Navigate to photo detail page
2. Click like (heart fills, count increments)
3. Navigate away before 1 second
4. Wait 1 second (watch network tab for POST)
5. Navigate back → like should be persisted

### Notification Dismissal
1. Have unseen notifications
2. Dismiss one from activity page
3. Navigate away quickly
4. Wait for sync
5. Navigate back → notification should be gone

### Page Unload
1. Like a photo
2. Immediately close the tab
3. Re-open → like should be persisted (sendBeacon)
