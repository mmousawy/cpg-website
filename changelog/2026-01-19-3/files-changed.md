# Files Changed - Real-time Notification Toasts & UX Improvements

## Overview

Enhanced the notification system with real-time toast notifications, improved accessibility, optimistic UI updates, and better mobile experience.

## Features Implemented

### 1. Supabase Realtime Integration

**File: `src/hooks/useRealtimeNotifications.tsx`**

New hook that subscribes to Supabase Realtime for live notification updates:
- Subscribes to `INSERT` events on `notifications` table
- Filters by `user_id=eq.${user.id}` for user-specific notifications
- Fetches full notification with actor details before displaying
- Tracks shown toast IDs to prevent duplicates
- Dispatches `notifications:refresh` event to update bell icon count
- Cleanup on unmount or user change

```typescript
const channel = supabase
  .channel(`notifications-${user.id}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${user.id}`,
    },
    async (payload) => {
      // Fetch full notification, show toast, dispatch refresh
    },
  )
  .subscribe();
```

### 2. Toast Components

**File: `src/components/notifications/ToastProvider.tsx`**

Configures Sonner toaster with app design system:
- Position: `top-right`
- Duration: 10 seconds default
- Styling: Uses CSS variables (--background-light, --border-color, etc.)
- Custom className for positioning overrides

**File: `src/components/notifications/NotificationToast.tsx`**

Custom toast component:
- Uses shared NotificationContent component
- Click to mark as seen and navigate via Link
- Dismiss button to close toast

**File: `src/components/notifications/NotificationToastManager.tsx`**

Wrapper component that manages toast system:
- Renders ToastProvider
- Calls useRealtimeNotifications hook
- Calls useAutoMarkNotificationsSeen hook

### 3. Unified Notification Content

**File: `src/components/notifications/NotificationContent.tsx`**

New shared component for notification display:
- Centralizes thumbnail/avatar/icon rendering
- Exports `notificationIcons` and `notificationMessages` maps
- Uses proper `<Link>` for navigation (accessibility & SEO)
- Action buttons (mark as seen, dismiss) outside the link
- Increased thumbnail size to 80px for retina displays

**New Icons (4 files in `public/icons/`):**
- `notification-calendar.svg` - Event reminders
- `notification-heart.svg` - Likes
- `notification-comment.svg` - Comments
- `notification-megaphone.svg` - Announcements

### 4. Auto-mark Notifications as Seen

**File: `src/hooks/useAutoMarkNotificationsSeen.ts`**

New hook for automatic notification marking:
- Uses `usePathname` to detect route changes
- Calls `markNotificationsSeenByLink` server action
- Dispatches events to update other components

**File: `src/lib/actions/notifications.ts`**

Added new server action:
```typescript
export async function markNotificationsSeenByLink(pathname: string)
```

### 5. Optimistic State Updates

**File: `src/hooks/useNotifications.ts`**

Enhanced with event-based state sync:
- Listens for `notifications:mark-seen`, `notifications:dismiss`, `notifications:mark-all-seen`
- Updates local state optimistically without refetching
- Only `notifications:refresh` triggers full fetch

**File: `src/app/account/activity/ActivityContent.tsx`**

- Dispatches specific events instead of generic refresh
- Removed router dependency (links handle navigation)

### 6. Mobile UX Improvements

**File: `src/components/layout/Header.tsx`**

- Added event listener for `notifications:sheet-open`
- Closes mobile menu when notification bottom sheet opens

**File: `src/components/notifications/MobileNotificationButton.tsx`**

- Dispatches `notifications:sheet-open` event when opening

**File: `src/app/globals.css`**

Responsive toast positioning:
```css
/* Desktop: header is 72px */
@media (min-width: 640px) {
  .toast-container {
    top: calc(72px + 1rem) !important;
    right: max(1rem, calc((100vw - 768px) / 2)) !important;
  }
}

/* Mobile: header is 57px */
@media (max-width: 639px) {
  .toast-container {
    top: calc(57px + 0.75rem) !important;
    left: 1rem !important;
    right: 1rem !important;
  }
}
```

### 7. Accessibility Improvements

**File: `src/components/notifications/NotificationItem.tsx`**

- Refactored to use proper `<Link>` elements
- Removed `role="button"` and `tabIndex` (link provides this)
- Action buttons remain outside link for independent interaction

## Dependencies Added

| Package | Version | Purpose |
|---------|---------|---------|
| sonner | ^1.x | Toast notification library |

## How It Works

### Real-time Flow
1. User logs in → `useRealtimeNotifications` subscribes to their notification channel
2. New notification created (e.g., someone likes their photo)
3. Supabase Realtime pushes INSERT event to client
4. Hook fetches full notification with actor details
5. Toast appears at top-right (desktop) or full-width (mobile)
6. `notifications:refresh` event dispatched → bell icon updates

### Auto-mark Flow
1. User has unseen notifications for `/events/123`
2. User navigates to `/events/123`
3. `useAutoMarkNotificationsSeen` detects route change
4. Calls `markNotificationsSeenByLink('/events/123')`
5. Matching notifications marked as seen
6. Events dispatched to update UI

### Optimistic Update Flow
1. User clicks "mark as seen" on notification
2. Local state updated immediately (seen_at set)
3. `notifications:mark-seen` event dispatched
4. Bell icon count decrements
5. Server action runs in background

## Visual Behavior

- **Desktop**: Top-right, 1rem below header, max-width 400px
- **Mobile**: Full-width with 1rem padding
- **Stacking**: Multiple toasts stack with scaling animation
- **Duration**: 10 seconds (configurable)
- **Z-index**: Behind header (z-39) so it doesn't overlap navigation

## All Modified Files (19 total)

### New Files (11)
- `src/hooks/useRealtimeNotifications.tsx`
- `src/hooks/useAutoMarkNotificationsSeen.ts`
- `src/components/notifications/ToastProvider.tsx`
- `src/components/notifications/NotificationToast.tsx`
- `src/components/notifications/NotificationToastManager.tsx`
- `src/components/notifications/NotificationHooks.tsx` - Wrapper for hooks, dynamically imported to avoid SSR issues
- `src/components/notifications/NotificationContent.tsx`
- `public/icons/notification-calendar.svg`
- `public/icons/notification-heart.svg`
- `public/icons/notification-comment.svg`
- `public/icons/notification-megaphone.svg`

### Modified Files (8)
- `src/app/layout.tsx` - Added NotificationToastManager component
- `src/app/globals.css` - Responsive toast container positioning
- `src/app/account/activity/ActivityContent.tsx` - Optimistic updates, removed router
- `src/components/layout/Header.tsx` - Close menu on notification sheet open
- `src/components/notifications/NotificationButton.tsx` - Optimistic updates, removed router
- `src/components/notifications/NotificationItem.tsx` - Use Link for accessibility
- `src/components/notifications/MobileNotificationButton.tsx` - Dispatch sheet-open event
- `src/hooks/useNotifications.ts` - Event-based state sync
- `src/lib/actions/notifications.ts` - Add markNotificationsSeenByLink action
