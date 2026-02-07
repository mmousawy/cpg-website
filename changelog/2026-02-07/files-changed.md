# Files Changed - Report Content Feature & UI Consistency

## Overview

Implemented a comprehensive content reporting system that allows both authenticated and anonymous users to report inappropriate content (photos, albums, profiles, and comments). The system includes an admin review queue with a detailed resolution workflow, email notifications for both admins and reporters, and support for BotID verification for anonymous submissions.

Also standardized UI text across all admin pages and forms to use sentence case instead of title case, improving consistency throughout the application.

## Database: Reports Table

### Schema Design

**File: `supabase/migrations/20260203000000_add_reports.sql`**

Created a comprehensive reports table that supports both authenticated and anonymous reporters:

```sql
CREATE TABLE "public"."reports" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "reporter_id" uuid,  -- NULL for anonymous reports
    "reporter_email" text,  -- Required for anonymous reports
    "reporter_name" text,  -- Required for anonymous reports
    "entity_type" text NOT NULL CHECK (entity_type IN ('photo', 'album', 'profile', 'comment')),
    "entity_id" uuid NOT NULL,
    "reason" text NOT NULL,
    "details" text,
    "status" text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'resolved', 'dismissed')),
    "reviewed_at" timestamp with time zone,
    "reviewed_by" uuid,  -- Admin who reviewed the report
    "admin_notes" text,  -- Resolution details
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
```

**Key design decisions:**
- Support for both authenticated users (via `reporter_id`) and anonymous users (via `reporter_email` and `reporter_name`)
- Status tracking: `pending`, `resolved`, `dismissed`
- Entity type constraint ensures only valid content types can be reported
- Foreign keys to profiles for both reporter and reviewer tracking
- Indexes on `status`, `entity_type/entity_id`, `reporter_id`, and `reporter_email` for efficient queries

### Row Level Security

Implemented RLS policies that:
- Allow authenticated users to view their own reports
- Allow admins to view all reports
- Allow authenticated users to create reports (with their own `reporter_id`)
- Allow admins to update reports for review/resolution
- Enforce that authenticated users cannot set `reporter_email` or `reporter_name` (those are for anonymous only)

## Report Submission Flow

### ReportModal Component

**File: `src/components/shared/ReportModal.tsx`**

A comprehensive modal for submitting reports that:

1. **Supports both authenticated and anonymous users:**
   - Authenticated users: Uses their profile automatically
   - Anonymous users: Requires name, email, and BotID verification

2. **Shows preview of reported content:**
   - Uses `PhotoListItem` for photo reports
   - Uses `AlbumMiniCard` for album reports
   - Displays `created_at` date instead of filename
   - Shows dynamic title with short_id, owner nickname, and "Untitled" handling

3. **Prevents infinite loops:**
   - Uses `useRef` for stable callback references (`handleSubmitRef`, `handleCloseRef`)
   - Memoizes footer content with `useMemo` to only update when `isSubmitting` changes
   - Prevents `ModalContext` re-render issues

```typescript
// Memoize footer to prevent infinite loops
const footerContent = useMemo(
  () => (
    <div className="flex justify-end gap-2">
      <Button variant="secondary" onClick={() => handleCloseRef.current?.()} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button onClick={() => handleSubmitRef.current?.()} disabled={isSubmitting} loading={isSubmitting}>
        Submit report
      </Button>
    </div>
  ),
  [isSubmitting],
);
```

4. **Dynamic modal title:**
   - Photos: `Report photo: "Untitled" (abc12) by @nickname`
   - Albums: `Report album: "Untitled Album" by @nickname`
   - Profiles: `Report profile: @nickname`
   - Comments: `Report comment`

### ReportButton Component

**File: `src/components/shared/ReportButton.tsx`**

A reusable button component that:
- Opens the `ReportModal` with appropriate entity type and ID
- Uses consistent styling (`variant="link"` with `className="text-xs text-foreground/60"`)
- Placed next to views count on album pages
- Added to Comments component for reporting individual comments
- Added to profile pages for reporting user profiles

### Integration Points

Reports can be submitted from:
- Photo detail pages (via `PhotoPageContent`)
- Album pages (next to view count)
- Profile pages (below social links)
- Comment threads (via `Comments` component)

## Admin Review Queue

### Reports Page

**File: `src/app/admin/reports/page.tsx`**

A comprehensive admin interface for reviewing reports:

1. **Tabbed interface:**
   - Pending: Reports awaiting review
   - Resolved: Reports that were resolved
   - Dismissed: Reports that were dismissed

2. **Report cards with detailed information:**
   - Two-column layout with narrow left column for labels (`whitespace-nowrap`)
   - Shows `created_at` date at the top
   - Displays preview of reported content (photo/album thumbnail with clickable link)
   - Shows reporter information (avatar, name, link to profile if authenticated)
   - Shows owner/creator of reported content
   - Displays reason and details
   - Shows resolution information (date, admin who resolved/dismissed) for resolved/dismissed reports
   - Horizontal rules between major sections

3. **Bulk actions:**
   - Checkbox in top-right corner for selecting reports
   - "Select all" / "Deselect all" button
   - Bulk resolve and dismiss actions
   - Sticky action bar matching challenges page styling

4. **Resolution workflow:**
   - Single report: Click "Resolve" or "Dismiss" button
   - Bulk: Select multiple reports, then "Resolve all" or "Dismiss all"
   - Opens `ResolveReportModal` for resolution details

5. **Empty state:**
   - Uses `SadSVG` icon matching challenges page
   - Consistent styling and messaging

6. **Data revalidation:**
   - Explicitly invalidates `['report-counts']` query key to update tab counts
   - Ensures accurate counts after resolving/dismissing reports

### ResolveReportModal Component

**File: `src/components/admin/ResolveReportModal.tsx`**

Modal for admin resolution input:
- Radio buttons for resolution type (e.g., "Content removed", "No violation found")
- Optional message field for admin notes
- Supports single report or bulk actions
- Dynamic text based on action type (resolve vs dismiss) and count

### Preview Components

**Files: `src/app/admin/reports/page.tsx` (PhotoReportPreview, AlbumReportPreview)**

- Uses `getSquareThumbnailUrl` for server-side cropped thumbnails (48x48px)
- Clickable thumbnails and avatars linking to content/profile pages
- Shows owner information with avatar and link
- Displays entity details (title, short_id, created_at, photo count)

## Email Notifications

### Admin Notifications

**File: `src/app/api/reports/notify/route.ts`**

Sends email to admins when a new report is submitted:
- Includes reporter information (name, email if anonymous)
- Shows reported entity details
- Links to admin reports page

**File: `src/emails/report-notification.tsx`**

Email template for admin notifications with:
- Reporter information
- Reported content preview
- Direct link to review the report

### Reporter Notifications

**File: `src/app/api/reports/resolved/notify/route.ts`**

Sends email to reporters when their report is resolved:
- Fetches detailed entity information (photo short_id, album photo count, owner nickname, created_at)
- Only sends for resolved reports (not dismissed)
- No unsubscribe option (user-triggered action)

**File: `src/emails/report-resolved.tsx`**

Email template with rich entity details:
- Uses `getFormattedEntityTitle()` helper to match ReportModal formatting
- Shows entity thumbnail, title, owner, creation date
- Displays resolution type and admin message
- Formats dates consistently

```typescript
function getFormattedEntityTitle(): string {
  if (entityType === 'photo') {
    const title = entityTitle || 'Untitled';
    const quotedTitle = title === 'Untitled' ? `"${title}"` : title;
    const shortIdPart = entityShortId ? ` (${entityShortId})` : '';
    const ownerPart = entityOwnerNickname ? ` by @${entityOwnerNickname}` : '';
    return `${quotedTitle}${shortIdPart}${ownerPart}`;
  }
  // Similar logic for albums...
}
```

## Data Layer & Hooks

### useReports Hook

**File: `src/hooks/useReports.ts`**

React Query hooks for reports:
- `useReportsForReview`: Fetches reports with status filter, includes reporter and reviewer joins
- `useReportCounts`: Fetches counts for each status (pending/resolved/dismissed)
- `useResolveReport`: Mutation for resolving/dismissing single report
- `useBulkResolveReports`: Mutation for bulk resolve/dismiss actions
- Both mutations invalidate `['reports']` and `['report-counts']` query keys

### Data Layer

**File: `src/lib/data/reports.ts`**

Server-side data fetching functions:
- `getReportsForReview`: Fetches reports with entity details, reporter info, reviewer info
- `getReportCounts`: Aggregates counts by status
- Handles joins to profiles, photos, albums based on entity_type

## UI Consistency: Sentence Case

### Admin Page Titles

Converted all admin page titles to sentence case:
- "Manage Members" → "Manage members"
- "Admin Tools" → "Admin tools"
- "Admin Dashboard" → "Admin dashboard" (already correct)

**Files modified:**
- `src/app/admin/members/page.tsx`
- `src/app/admin/tools/page.tsx`
- All other admin pages already used sentence case

### Form Labels

Converted form labels to sentence case:
- "Event Title *" → "Event title *"
- "URL Slug *" → "URL slug *"
- "Prompt / Description *" → "Prompt / description *"
- "Cover Image" → "Cover image"
- "Change Image" → "Change image"

**Files modified:**
- `src/components/admin/EventForm.tsx`
- `src/components/admin/EventCoverUpload.tsx`
- `src/app/admin/challenges/[slug]/page.tsx`

### Button Labels

- "Accept All" → "Accept all"

**File: `src/app/admin/challenges/[slug]/submissions/page.tsx`**

### Header Standardization

Standardized header styling across all admin pages to match challenges page:
- `h1`: `text-2xl sm:text-3xl font-bold`
- `p`: `text-base sm:text-lg mt-2 text-foreground/70`

**Files modified:**
- All admin pages (already standardized in previous update)

## Component Updates

### PhotoListItem

**File: `src/components/manage/PhotoListItem.tsx`**

- Updated to display `created_at` date instead of filename
- Added support for `className` prop to allow vertical centering (`items-center`)
- Uses `clsx` to merge classes correctly, allowing override of default `items-start`

```typescript
const hasItemsOverride = className.includes('items-center') || className.includes('items-end');
const baseClasses = clsx(
  'flex gap-2 border border-border-color bg-background-medium p-0',
  hasItemsOverride ? '' : 'items-start',
  className,
);
```

### AlbumMiniCard

**File: `src/components/album/AlbumMiniCard.tsx`**

- Added `createdAt` prop to display creation date
- Added `className` prop for flexible styling (used for right padding in ReportModal)
- Removed slug from title display

### Avatar Component

**File: `src/components/auth/Avatar.tsx`**

- Added fallback for `sizeConfig` to prevent undefined errors:
```typescript
const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;
```

### Comments Component

**File: `src/components/shared/Comments.tsx`**

- Added `ReportButton` for reporting individual comments
- Uses consistent tiny link styling (`text-xs text-foreground/60`)

## Revalidation

**File: `src/app/actions/revalidate.ts`**

Added revalidation functions for reports:
- `revalidateReports()`: Invalidates reports cache
- Called after report submission and resolution

## Documentation

### Changelog Command Consolidation

**File: `.cursor/commands/update-changelog.md`**

- Consolidated duplicate `commands/update-changelog.md` into `.cursor/commands/update-changelog.md`
- Kept the more comprehensive version with automatic git analysis
- Added step 5: Check and update README.md with changes/roadmap

**File: `commands/update-changelog.md`**

- Deleted duplicate file

### README Updates

**File: `README.md`**

- Updated Moderation section: Changed "Report content" from `[ ]` to `[x]` (completed)
- Feature will be documented in Features section in next update

## All Modified Files

**New files (15):**
- `supabase/migrations/20260203000000_add_reports.sql`
- `src/app/admin/reports/page.tsx`
- `src/app/api/reports/route.ts`
- `src/app/api/reports/notify/route.ts`
- `src/app/api/reports/resolved/notify/route.ts`
- `src/components/admin/ResolveReportModal.tsx`
- `src/components/shared/ReportButton.tsx`
- `src/components/shared/ReportModal.tsx`
- `src/emails/report-notification.tsx`
- `src/emails/report-resolved.tsx`
- `src/hooks/useReports.ts`
- `src/lib/data/reports.ts`
- `src/types/reports.ts`
- `public/icons/content.svg`
- `.cursor/commands/update-changelog.md`

**Modified files (30):**
- `README.md`
- `src/app/[nickname]/album/[albumSlug]/AlbumContent.tsx`
- `src/app/[nickname]/page.tsx`
- `src/app/actions/revalidate.ts`
- `src/app/admin/challenges/[slug]/page.tsx`
- `src/app/admin/challenges/[slug]/submissions/page.tsx`
- `src/app/admin/challenges/page.tsx`
- `src/app/admin/events/[eventId]/page.tsx`
- `src/app/admin/events/attendance/[eventId]/page.tsx`
- `src/app/admin/events/page.tsx`
- `src/app/admin/members/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/tools/page.tsx`
- `src/app/api/test/cleanup/route.ts`
- `src/components/admin/EventCoverUpload.tsx`
- `src/components/admin/EventForm.tsx`
- `src/components/album/AlbumMiniCard.tsx`
- `src/components/auth/Avatar.tsx`
- `src/components/layout/Header.tsx`
- `src/components/manage/PhotoListItem.tsx`
- `src/components/photo/PhotoPageContent.tsx`
- `src/components/shared/Comments.tsx`
- `src/database.types.ts`
- `src/types/notifications.ts`
- `supabase/storage-policies.sql`

**Deleted files (1):**
- `commands/update-changelog.md`
