# Files Changed - Comment Replies & Responsive Sidebar

## Overview

Implemented a comprehensive comment reply system that allows users to reply to comments and other replies, creating nested conversation threads. The system includes proper notification handling for both entity owners and parent comment authors, email templates for reply notifications, and a polished UI with floating reply buttons and responsive sidebar widths.

Also improved the sidebar layout to be responsive with different widths for tablet (384px) and desktop (512px) breakpoints, providing better space utilization across device sizes.

## Database: Comment Replies Support

### Migration: `supabase/migrations/20260207120000_add_comment_replies.sql`

Added support for comment replies with a self-referencing foreign key:

```sql
-- Add parent_comment_id column to comments table
ALTER TABLE "public"."comments"
ADD COLUMN "parent_comment_id" uuid;

-- Add foreign key constraint with CASCADE delete
ALTER TABLE "public"."comments"
ADD CONSTRAINT "comments_parent_comment_id_fkey"
FOREIGN KEY ("parent_comment_id")
REFERENCES "public"."comments"("id")
ON DELETE CASCADE;

-- Add index for fast reply lookups
CREATE INDEX "comments_parent_comment_id_idx"
ON "public"."comments"("parent_comment_id")
WHERE "parent_comment_id" IS NOT NULL;
```

**Key design decisions:**
- Single-level threading: Replies always attach to the original parent comment, not nested replies
- CASCADE delete ensures replies are deleted when parent comment is deleted
- Partial index only indexes non-null values for efficiency
- All replies are still linked to the entity (photo/album/event/challenge) for proper querying

### Updated Database Functions

All comment creation functions now support an optional `p_parent_comment_id` parameter:

**`add_comment` function:**
- Accepts `p_parent_comment_id uuid DEFAULT NULL`
- Validates parent comment exists and is not deleted
- Flattens to original parent if replying to a reply: `COALESCE(parent_comment_id, id)`
- Links reply to entity so it appears in entity queries

**`add_event_comment` and `add_challenge_comment` functions:**
- Same pattern: accept optional parent comment ID
- Validate and flatten to original parent
- Maintain entity linkage for proper display

**Flattening logic:**
```sql
-- Get the parent comment and flatten to original parent if it's already a reply
SELECT COALESCE(parent_comment_id, id) INTO v_actual_parent_id
FROM comments
WHERE id = p_parent_comment_id
  AND deleted_at IS NULL;
```

This ensures all replies attach to top-level comments, keeping the threading model simple and preventing deep nesting.

## Comment Replies UI

### Comments Component Refactor

**File: `src/components/shared/Comments.tsx`**

Major refactor to support nested replies with optimized rendering:

**1. CommentItem Subcomponent:**
- Extracted comment rendering into separate `CommentItem` component
- Wrapped with `React.memo` to prevent unnecessary re-renders
- Custom comparison function checks only relevant props for changes
- Stable component identity prevents React from recreating components

**2. Reply State Management:**
- `replyingTo`: Tracks which comment ID is currently being replied to
- `replyText`: Object mapping comment IDs to reply text values
- `replyToMap`: Tracks which comment a reply was responding to (for visual context)
- All state persisted in localStorage with entity-specific keys

**3. Nested Reply Display:**
- Replies are organized into `replies` (first-level) and `nestedReplies` (replies to replies)
- Visual nesting with left border and indentation
- "replied to @nickname" link shows context and scrolls to parent
- Collapse/expand functionality for managing long threads
- Reply count badges show total nested replies

**4. Reply Button:**
- Converted from plain button to `Button` component with `variant="ghost"`
- Positioned absolutely at bottom-right of comment card (`absolute bottom-2 right-2`)
- Tiny styling: `px-2 py-0.5 text-xs` with custom border and background
- Toggles between "Reply" and "Cancel" when active

**5. Reply Form:**
- Inline form appears when reply button is clicked
- Shows "Replying to @nickname" context
- Textarea with placeholder "Write a reply..."
- Submit button disabled when text is empty or submitting
- Clears form and closes on successful submission

**6. Data Processing:**
- Fetches all comments for entity
- Groups replies by `parent_comment_id`
- Builds nested structure with `replies` and `nestedReplies` arrays
- Handles `replyToMap` for tracking which reply responded to which comment
- Maintains sort order from database

**7. Performance Optimizations:**
- Memoized `CommentItem` with custom comparison
- Only re-renders when relevant props change (reply state, text values)
- Prevents cascading re-renders when unrelated comments update
- Careful prop drilling to avoid unnecessary updates

### Reply Context Display

When a reply is made to another reply, the UI shows:
```
replied to @nickname
```

This link:
- Scrolls to the parent comment smoothly
- Highlights the parent comment with border and background color
- Removes highlight after 2 seconds
- Provides visual context for conversation flow

## API Routes: Reply Support

### Comments API: `src/app/api/comments/route.ts`

**POST endpoint updates:**

1. **Accept parentCommentId:**
```typescript
const { entityType, entityId, commentText, parentCommentId } = body;
```

2. **Pass to database functions:**
```typescript
await supabase.rpc('add_comment', {
  p_entity_type: entityType,
  p_entity_id: entityId,
  p_comment_text: commentText.trim(),
  p_parent_comment_id: parentCommentId || null,
});
```

3. **Fetch parent comment author for notifications:**
```typescript
if (parentCommentId) {
  const { data: parentComment } = await supabase
    .from('comments')
    .select('user_id, profiles!comments_user_id_fkey(id, email, full_name, nickname)')
    .eq('id', parentCommentId)
    .is('deleted_at', null)
    .single();
  
  // Extract profile info for notification
}
```

4. **Send notifications to parent comment author:**
- Creates `comment_reply` notification
- Sends email if parent author hasn't opted out
- Includes reply-specific email content

## Notifications: Reply Support

### Notification Type

**File: `src/types/notifications.ts`**

Added `comment_reply` to notification types:
```typescript
export type NotificationType =
  | 'comment_album'
  | 'comment_event'
  | 'comment_challenge'
  | 'comment_reply'  // New
  | 'follow'
  // ...
```

### Notification Content

**File: `src/components/notifications/NotificationContent.tsx`**

Added icon and message for reply notifications:
```typescript
comment_reply: CommentSVG,  // Uses same icon as comments

comment_reply: (actor) => `${actor || 'Someone'} replied to your comment`,
```

### Email Templates

**File: `src/emails/comment-notification.tsx`**

Updated to handle reply notifications:

**New prop:**
```typescript
isReply?: boolean;
```

**Dynamic content:**
```typescript
const previewText = isReply
  ? `${commenterName} replied to your comment on ${entityTitle}`
  : `${commenterName} commented on your ${entityType}`;

// Heading
{isReply
  ? 'New reply to your comment'
  : `New comment on your ${entityType === 'album' ? 'album' : 'photo'}`}

// Body text
{isReply
  ? `Someone replied to your comment on ${entityTitle}:`
  : `Someone commented on your ${entityType}:`}
```

**Email sending logic:**
- Checks if parent comment author has opted out of notifications
- Only sends if `opted_out !== true`
- Includes opt-out link in email footer
- Uses reply-specific subject line and content

## Responsive Sidebar Improvements

### Sidebar Width Changes

**Files:**
- `src/components/photo/PhotoPageContent.tsx`
- `src/app/[nickname]/album/[albumSlug]/AlbumContent.tsx`

**Before:**
```typescript
md:w-96  // 384px fixed width
```

**After:**
```typescript
md:w-96 lg:w-128  // 384px on tablet, 512px on desktop
```

**Breakpoints:**
- `md` (768px+): 384px sidebar width
- `lg` (1024px+): 512px sidebar width

This provides:
- More compact layout on tablets (better for smaller screens)
- More spacious layout on desktop (better for reading comments and metadata)

### Filmstrip Max-Width Updates

**File: `src/components/photo/AlbumFilmstrip.tsx`**

Updated max-width calculations to account for wider desktop sidebar:

**Before:**
```typescript
md:max-w-[calc(100vw-432px)] lg:max-w-[calc(100vw-480px)]
```

**After:**
```typescript
md:max-w-[calc(100vw-432px)] lg:max-w-[calc(100vw-608px)]
```

**Calculation breakdown:**
- `md`: 384px (sidebar) + 16px (gap) + 32px (padding) = 432px
- `lg`: 512px (sidebar) + 32px (gap) + 64px (padding) = 608px

This ensures the filmstrip doesn't overflow into the sidebar on desktop while maintaining proper spacing on tablet.

## UI Improvements

### Reply Button Styling

**Before:**
```typescript
<button
  onClick={() => onReplyClick(comment.id)}
  className="text-xs text-foreground/60 hover:text-primary transition-colors"
>
  {isCurrentlyReplying ? 'Cancel' : 'Reply'}
</button>
```

**After:**
```typescript
<div className="absolute bottom-2 right-2">
  <Button
    onClick={() => onReplyClick(comment.id)}
    variant="ghost"
    size="sm"
    className="px-2! py-0.5! text-xs h-auto border border-border-color bg-foreground/5 text-foreground/70"
  >
    {isCurrentlyReplying ? 'Cancel' : 'Reply'}
  </Button>
</div>
```

**Improvements:**
- Uses Button component for consistency with design system
- Floating position at bottom-right of comment card
- Tiny size with custom padding
- Ghost variant with subtle border and background
- Better visual hierarchy

**Comment card positioning:**
- Added `relative` to comment card container
- Enables absolute positioning for reply button
- Button floats above content without affecting layout

## Database Types

**File: `src/database.types.ts`**

Updated to include `parent_comment_id` in comments table type:
```typescript
parent_comment_id: string | null;
```

## README Updates

**File: `README.md`**

Updated roadmap to mark comment replies as completed:
```markdown
- [x] Reply to comments  // Changed from [ ] to [x]
```

## All Modified Files

**New files (1):**
- `supabase/migrations/20260207120000_add_comment_replies.sql`

**Modified files (10):**
- `README.md` - Updated roadmap
- `src/app/[nickname]/album/[albumSlug]/AlbumContent.tsx` - Responsive sidebar width
- `src/app/api/comments/route.ts` - Reply support and parent author notifications
- `src/components/notifications/NotificationContent.tsx` - Reply notification icon and message
- `src/components/photo/AlbumFilmstrip.tsx` - Updated max-width for desktop sidebar
- `src/components/photo/PhotoPageContent.tsx` - Responsive sidebar width
- `src/components/shared/Comments.tsx` - Complete reply system implementation
- `src/database.types.ts` - Added parent_comment_id field
- `src/emails/comment-notification.tsx` - Reply email template support
- `src/types/notifications.ts` - Added comment_reply notification type
