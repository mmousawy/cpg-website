# Files Changed - Activity Feed & In-App Notifications System

## Overview

Complete implementation of activity feed and in-app notifications system, including notification button in header, dedicated activity page, weekly digest emails, and all supporting infrastructure.

## Features Implemented

### 1. Notifications Database Schema

**Migrations:**
- `supabase/migrations/20260119000000_create_notifications.sql` - Creates notifications table with RLS policies and Realtime support
- `supabase/migrations/20260119000001_optimize_notifications_rls.sql` - Optimizes RLS policies using `(select auth.uid())` pattern
- `supabase/migrations/20260119000002_add_notifications_dismissed.sql` - Adds dismissed_at column for removing notifications from menu
- `supabase/migrations/20260119100000_add_weekly_digest_email_type.sql` - Adds weekly_digest email type for independent preference control

**Schema:**
- `notifications` table with user_id, actor_id, type, entity_type, entity_id, data (jsonb), seen_at, dismissed_at, created_at
- Optimized RLS policies for performance
- Indexes for unseen notifications and active notifications
- Realtime enabled for live updates

### 2. Notification Types & Types System

**File: `src/types/notifications.ts`**

Defines TypeScript types:
- `NotificationType` - like_photo, like_album, comment_photo, comment_album, comment_event, follow, event_reminder, event_announcement, admin_message
- `NotificationEntityType` - photo, album, event, profile, system
- `NotificationData` - JSON structure for notification metadata
- `NotificationWithActor` - Notification with joined actor profile data
- `NotificationActor` - Derived from Profile using Pick utility type

### 3. Notification Creation & Management

**File: `src/lib/notifications/create.ts`**

- `createNotification()` function using admin client to bypass RLS
- Handles all notification types with proper data structure

**File: `src/lib/actions/notifications.ts`**

Server actions:
- `markNotificationAsSeen()` - Mark single notification as seen
- `markAllNotificationsAsSeen()` - Mark all notifications as seen
- `dismissNotification()` - Dismiss notification (removes from menu)
- `createMockNotifications()` - Dev utility for testing

**File: `src/lib/data/notifications.ts`**

Data fetching functions (using authenticated client for RLS):
- `getUnseenNotificationsCount()` - Get count of unseen notifications
- `getRecentNotifications()` - Get last N notifications
- `getTotalNotificationsCount()` - Get total active notifications count
- `getAllNotifications()` - Get all notifications for activity page

### 4. Notification API Routes

**File: `src/app/api/notifications/route.ts`**

- GET endpoint with pagination support (limit, offset)
- Returns notifications with actor data, unseen count, total count, hasMore flag
- Supports pagination for notification menus and activity page

**File: `src/app/api/cron/weekly-digest/route.ts`**

Weekly digest cron job:
- Fetches unseen notifications from past 7 days
- Groups by user
- Checks weekly_digest email preferences
- Sends batch emails (max 100 per batch per Resend limit)
- Includes unsubscribe links with weekly_digest type

### 5. Notification Components

**File: `src/components/notifications/NotificationButton.tsx`**

Desktop notification button in header:
- Bell icon with unseen count badge
- Dropdown menu showing last 20 notifications
- Pagination with "Load more" button
- Links to activity page
- Empty state with mock notification creation

**File: `src/components/notifications/MobileNotificationButton.tsx`**

Mobile notification button:
- Bottom sheet menu for notifications
- Always positioned left of avatar
- "View all notifications" button at bottom
- Pagination support

**File: `src/components/notifications/NotificationItem.tsx`**

Individual notification item:
- Shows thumbnail, actor avatar, or SVG icon based on notification type
- Keyboard accessible (tab, enter/space)
- Visual distinction for seen/unseen (left border, background tint)
- Click to view, dismiss button (only on activity page)
- Uses Heroicons SVG icons instead of emojis

### 6. Activity Page

**File: `src/app/account/activity/page.tsx`**

Server component:
- Authenticates user
- Fetches initial 40 notifications and total count
- Passes to client component

**File: `src/app/account/activity/ActivityContent.tsx`**

Client component:
- Groups notifications by date (Today, Yesterday, This week, Earlier)
- Card styling matching other pages
- "Mark all as seen" button
- Pagination with "Load more" (40 per page)
- Dismiss functionality
- Mock notification creation in empty state

### 7. Notification Hooks

**File: `src/hooks/useNotifications.ts`**

React hook for notification state management:
- Fetches notifications from API
- Manages pagination state
- Listens for custom `notifications:refresh` events
- Realtime subscription disabled due to SSR hydration issues (uses custom events instead)
- Functions: markAsSeen, markAllAsSeen, dismiss, loadMore, refresh

### 8. Integration Points

**File: `src/components/layout/Header.tsx`**

- Integrated NotificationButton (desktop) and MobileNotificationButton (mobile)
- Notification button positioned left of avatar

**File: `src/components/layout/MobileMenu.tsx`**

- Added "Activity" link to mobile menu

**File: `src/lib/actions/likes.ts`**

- Triggers notifications for photo and album likes
- Self-notification checks: `photo.user_id !== user.id` and `album.user_id !== user.id`

**File: `src/app/api/comments/route.ts`**

- Triggers notifications for comments on albums, photos, and events
- Self-notification checks: `ownerId !== user.id`
- Returns emailTypeKey instead of emailTypeLabel for unsubscribe route

### 9. Weekly Digest Email

**File: `src/emails/weekly-digest.tsx`**

React Email template:
- Lists up to 5 unseen notifications
- Shows total count
- Links to activity page
- Individual notification links to object pages
- Formatted dates in Amsterdam timezone
- Resized thumbnails using Supabase image transformation
- Unsubscribe link

**File: `vercel.json`**

- Added weekly digest cron job schedule

### 10. Email Preferences & Unsubscribe

**File: `src/utils/emailPreferencesClient.ts`**

- Added `'weekly_digest'` to EmailType union
- Functions for fetching and updating email preferences

**File: `src/app/unsubscribe/[token]/page.tsx`**

- Added `weekly_digest: 'the weekly digest'` to emailTypeLabels
- Improved wording for different email types

**File: `src/app/api/unsubscribe/route.ts`**

- Returns emailTypeKey for proper unsubscribe page display

### 11. UI Components & Styling

**File: `src/components/shared/BottomSheet.tsx`**

- Fixed backdrop filter animation by removing transition-opacity from parent container
- Allows backdrop's own opacity transition to animate smoothly

**File: `src/components/shared/Button.tsx`**

- Used for "View all notifications" link in mobile bottom sheet

**File: `src/components/shared/Comments.tsx`**

- Integrated notification creation for comments

### 12. Fixes & Improvements

**Activity Page Empty State:**
- Fixed by changing `createPublicClient()` to `createClient()` in notification data functions
- Ensures RLS policies work correctly with authenticated session

**Realtime Subscription:**
- Disabled due to SSR hydration issues in Next.js 16
- Uses custom event system (`notifications:refresh`) instead
- Notifications update via API polling and custom events

**Activity Page Styling:**
- Added card containers matching other pages
- Left border indicator for unseen notifications
- Proper empty state design

**Self-Notification Prevention:**
- Restored checks to prevent notifications for own actions
- Photo/album likes: `user_id !== user.id`
- Comments: `ownerId !== user.id`

## All Modified Files (36 total)

### New Files (18)
- `supabase/migrations/20260119000000_create_notifications.sql`
- `supabase/migrations/20260119000001_optimize_notifications_rls.sql`
- `supabase/migrations/20260119000002_add_notifications_dismissed.sql`
- `supabase/migrations/20260119100000_add_weekly_digest_email_type.sql`
- `src/app/account/activity/ActivityContent.tsx`
- `src/app/account/activity/page.tsx`
- `src/app/api/cron/weekly-digest/route.ts`
- `src/app/api/notifications/route.ts`
- `src/components/notifications/MobileNotificationButton.tsx`
- `src/components/notifications/NotificationButton.tsx`
- `src/components/notifications/NotificationItem.tsx`
- `src/emails/weekly-digest.tsx`
- `src/hooks/useNotifications.ts`
- `src/lib/actions/notifications.ts`
- `src/lib/data/notifications.ts`
- `src/lib/notifications/create.ts`
- `src/types/notifications.ts`
- `changelog/2026-01-19-2/commit-message.txt`
- `changelog/2026-01-19-2/files-changed.md`

### Modified Files (18)
- `.cursorrules`
- `README.md`
- `src/app/api/comments/route.ts` - Added notification creation, self-notification checks, emailTypeKey return
- `src/app/api/unsubscribe/route.ts` - Returns emailTypeKey
- `src/app/email/[template]/page.tsx` - Email preview support
- `src/app/events/[eventSlug]/page.tsx` - Notification integration
- `src/app/unsubscribe/[token]/page.tsx` - Added weekly_digest label, improved wording
- `src/components/album/AlbumGrid.tsx` - Notification integration
- `src/components/layout/Header.tsx` - Added NotificationButton and MobileNotificationButton
- `src/components/layout/MobileMenu.tsx` - Added Activity link
- `src/components/shared/BottomSheet.tsx` - Fixed backdrop animation
- `src/components/shared/Button.tsx` - Used in mobile notifications
- `src/components/shared/Comments.tsx` - Notification integration
- `src/database.types.ts` - Updated with notifications table types
- `src/lib/actions/likes.ts` - Added notification creation, self-notification checks
- `src/utils/emailPreferencesClient.ts` - Added weekly_digest to EmailType
- `vercel.json` - Added weekly digest cron schedule

## Impact

- Complete activity feed and notification system implemented
- Real-time updates via custom events (Realtime disabled due to SSR issues)
- Users can view, mark as seen, and dismiss notifications
- Weekly digest emails with independent preference control
- Self-notification prevention for likes and comments
- Proper styling matching existing app design
- Keyboard accessible notification items
- Pagination support for large notification lists
- Mobile-friendly bottom sheet for notifications
