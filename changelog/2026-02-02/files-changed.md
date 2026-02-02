# Files Changed - Photo Challenges Feature

## Overview

This is a major feature addition implementing photo challenges. Admins create themed challenges with prompts, members submit photos (either uploading new ones or selecting from their library), and all submissions require admin approval before appearing in the public gallery.

The feature follows existing patterns in the codebase - using React Query for data fetching, Supabase RPCs for complex operations, and the modal system for submission flows.

## Database Schema

### New Tables

**challenges** - Stores challenge metadata:
- `slug`, `title`, `prompt` - Basic info
- `cover_image_url`, `image_blurhash`, `image_width`, `image_height` - Cover image with blurhash
- `starts_at`, `ends_at` - Submission window
- `announced_at` - When challenge was announced via email
- `max_photos_per_user` - Optional limit on submissions per user
- `is_active` - Admin can deactivate

**challenge_submissions** - Tracks all submissions:
- Links `challenge_id`, `photo_id`, `user_id`
- `status` - pending, accepted, or rejected
- `rejection_reason` - Optional explanation for rejections
- Unique constraint on (challenge_id, photo_id) prevents duplicate submissions

**challenge_announcements** - Tracks announcement history (like event_announcements)

### RPC Functions

```sql
-- Submit photos to a challenge (validates ownership, prevents duplicates)
submit_to_challenge(p_challenge_id, p_photo_ids) RETURNS integer

-- Review a single submission
review_challenge_submission(p_submission_id, p_status, p_rejection_reason)

-- Bulk review multiple submissions
bulk_review_challenge_submissions(p_submission_ids, p_status, p_rejection_reason)
```

The `submit_to_challenge` RPC now also prevents resubmission of previously rejected photos.

### Views

**challenge_photos** - Convenience view joining accepted submissions with photo details and user profiles for the public gallery.

## Public Pages

### /challenges

Lists all challenges in two sections:
- **Active Challenges** - Currently accepting submissions
- **Past Challenges** - Ended or inactive

Uses `ChallengesList` component with `ChallengeCard` for each challenge.

### /challenges/[slug]

Challenge detail page with:
- Cover image with PhotoSwipe lightbox
- Challenge header with title, prompt, deadline countdown
- Contributors (stacked avatars of accepted submitters)
- Photo gallery of accepted submissions
- Comments section
- Submit button (opens modal for authenticated users)

## User Features

### Submission Flow

The `SubmitToChallengeContent` modal provides:
- **Drag-and-drop upload** - Drop photos directly onto the grid
- **Library selection** - Select from existing photos
- **Upload button** in footer for manual file selection
- Photos uploaded via this flow are **public by default**
- Newly uploaded photos are auto-selected
- Quota enforcement (if max_photos_per_user is set)

Visual feedback:
- Already-submitted photos are hidden
- Rejected photos shown with red badge (can't be resubmitted)
- Private photos shown but disabled with tooltip

### /account/challenges

User's submission dashboard showing:
- All challenges they've participated in
- Submission status (pending/accepted/rejected)
- Can withdraw pending submissions

### Notifications

Users receive notifications when:
- A challenge is announced (if opted in)
- Their submission is accepted
- Their submission is rejected (with reason if provided)

## Admin Features

### /admin/challenges

List of all challenges with stats:
- Pending, accepted, rejected counts
- Quick links to edit and review submissions

### /admin/challenges/[slug]

Create/edit form with:
- Title, slug (auto-generated), prompt
- Cover image upload with blurhash generation
- Start/end dates
- Max photos per user limit
- Announce button (opens modal)
- Delete option for existing challenges

### /admin/challenges/[slug]/submissions

Review queue with tabs:
- **Pending** - Awaiting review (oldest first)
- **Accepted** - Approved submissions
- **Rejected** - Declined submissions

Features:
- PhotoSwipe lightbox for full-size preview
- Link to photo's detail page
- Accept/reject with optional reason
- Bulk select and bulk actions
- User info with avatar linking to profile

### Announcement Flow

`AnnounceChallengeModal` reuses the `RecipientList` component from events:
- Shows all users who haven't opted out of photo_challenges emails
- Filter and select recipients
- Sends batch emails (100/batch with 500ms delay)
- Creates in-app notifications

## Notifications System

### New Notification Types

```typescript
type NotificationType = 
  | 'challenge_announced'     // New challenge available
  | 'new_submission'          // Admin: user submitted photos
  | 'submission_accepted'     // User: photo was accepted
  | 'submission_rejected'     // User: photo was rejected
```

### Email Templates

- **challenge-announcement.tsx** - Notify users of new challenges
- **submission-notification.tsx** - Notify admins of new submissions
- **submission-result.tsx** - Notify users of accept/reject decisions

### Admin Notifications Email Type

Added `admin_notifications` email type that's only visible to admins in preferences. Non-admins don't see this option in their account settings or onboarding.

## Components

### GridCheckbox

Extracted the selection checkbox from `SortableGridItem` into a reusable component. Used in both the photo management grid and the admin review queue.

### CardBadges

Added `rejected` variant with red styling for showing rejected photos in the submission grid.

### ProfileStatsBadges

Added two new achievement badges:
- **Challenges** - Number of unique challenges participated in
- **Challenge submissions** - Number of photos accepted (trophy icon)

## Routing

Added to `routes.ts`:
- `/challenges` - Public challenges listing
- `/account/challenges` - User's submissions

Navigation updated:
- Header, MobileMenu, UserMenu all include Challenges link

## All Modified Files

### New Files (48)

**Database:**
- supabase/migrations/20260202000000_add_photo_challenges.sql
- supabase/migrations/20260202100000_add_challenge_max_photos.sql
- supabase/migrations/20260202100000_allow_challenge_photos_viewing.sql
- supabase/migrations/20260202110000_add_profile_to_challenge_photos.sql
- supabase/migrations/20260202120000_enforce_public_challenge_photos.sql
- supabase/migrations/20260202200000_add_challenge_comments.sql
- supabase/migrations/20260202300000_add_admin_notifications_email_type.sql
- supabase/migrations/20260202400000_prevent_rejected_resubmission.sql
- supabase/migrations/20260202500000_add_challenge_stats_to_rpcs.sql

**Types & Data:**
- src/types/challenges.ts
- src/lib/data/challenges.ts
- src/hooks/useChallenges.ts
- src/hooks/useChallengeSubmissions.ts

**Pages:**
- src/app/challenges/page.tsx
- src/app/challenges/[slug]/page.tsx
- src/app/challenges/[slug]/ChallengeComments.tsx
- src/app/account/challenges/page.tsx
- src/app/admin/challenges/page.tsx
- src/app/admin/challenges/[slug]/page.tsx
- src/app/admin/challenges/[slug]/submissions/page.tsx

**API Routes:**
- src/app/api/admin/challenges/announce/route.ts
- src/app/api/challenges/notify-submission/route.ts
- src/app/api/challenges/notify-result/route.ts

**Components:**
- src/components/challenges/index.ts
- src/components/challenges/ChallengeCard.tsx
- src/components/challenges/ChallengeHeader.tsx
- src/components/challenges/ChallengeCoverImage.tsx
- src/components/challenges/ChallengeGallery.tsx
- src/components/challenges/ChallengesList.tsx
- src/components/challenges/SubmitButton.tsx
- src/components/challenges/SubmitToChallengeContent.tsx
- src/components/challenges/SubmissionSuccessContent.tsx
- src/components/admin/AnnounceChallengeModal.tsx
- src/components/shared/GridCheckbox.tsx

**Emails:**
- src/emails/challenge-announcement.tsx
- src/emails/submission-notification.tsx
- src/emails/submission-result.tsx

**Icons:**
- public/icons/award-star.svg
- public/icons/award-star-mini.svg
- public/icons/clock-mini.svg
- public/icons/link.svg
- public/icons/photo-stack.svg
- public/icons/photo-stack-mini.svg
- public/icons/trophy.svg
- public/icons/undo.svg
- public/icons/upload.svg

### Modified Files (27)

- src/types/notifications.ts - Add new notification types
- src/database.types.ts - Regenerated with new tables/functions
- src/config/routes.ts - Add challenges routes
- src/lib/data/index.ts - Export challenges data functions
- src/lib/data/profiles.ts - Add challenge stats to profile stats
- src/app/actions/revalidate.ts - Add revalidateChallenge action
- src/app/api/account/stats/route.ts - Add challenge stats fields
- src/app/api/comments/route.ts - Support challenge comments
- src/app/admin/page.tsx - Add challenges link
- src/app/onboarding/OnboardingClient.tsx - Filter admin email types
- src/hooks/useAccountForm.ts - Filter admin email types for non-admins
- src/components/layout/Header.tsx - Add Challenges nav link
- src/components/layout/MobileMenu.tsx - Add Challenges nav link
- src/components/layout/UserMenu.tsx - Add My Challenges link
- src/components/notifications/NotificationContent.tsx - Handle new types
- src/components/manage/PhotoCard.tsx - Add rejected prop and badge
- src/components/manage/PhotoGrid.tsx - Add rejectedIds prop
- src/components/manage/SortableGridItem.tsx - Use GridCheckbox component
- src/components/shared/CardBadges.tsx - Add rejected variant
- src/components/shared/ProfileStatsBadges.tsx - Add challenge badges
- src/components/shared/Comments.tsx - Support challenge entity type
- src/emails/components/Footer.tsx - Support admin_notifications type
- public/icons/image.svg - Minor update
