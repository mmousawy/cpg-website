# Files Changed - Interests, Discovery, Event Comments & Cron

## New Files

### Database
- `temp_migrations/create_interests_system.sql` - Interests system migration
- `temp_migrations/create_event_comments.sql` - Event comments migration
- `supabase/migrations/20260116163348_add_event_reminder_columns.sql` - Event reminder tracking columns

### Components
- `src/components/shared/InterestInput.tsx` - Interest input component with autocomplete
- `src/components/shared/InterestCloud.tsx` - Interest cloud display component
- `src/components/shared/MemberCard.tsx` - Reusable member card component
- `src/components/shared/TagCloud.tsx` - Tag cloud display component
- `src/components/shared/PopularTagsSection.tsx` - Server component for popular tags section

### Pages
- `src/app/members/page.tsx` - Main members discovery page
- `src/app/members/interest/[interest]/page.tsx` - Members by interest page
- `src/app/members/tag/[tag]/page.tsx` - Members by tag page
- `src/app/gallery/tag/[tag]/page.tsx` - Gallery tag browsing page
- `src/app/events/[eventSlug]/EventComments.tsx` - Event comments component

### API Routes
- `src/app/api/cron/event-reminders/route.ts` - Cron job endpoint for automated event reminders

### Email Templates
- `src/emails/rsvp-reminder.tsx` - RSVP reminder email template
- `src/emails/attendee-reminder.tsx` - Attendee reminder email template

### Data Layer
- `src/lib/data/interests.ts` - Interests data fetching functions
- `src/lib/data/members.ts` - Member discovery data fetching functions

### Types
- `src/types/interests.ts` - Interest type definitions

## Modified Files

### Account Settings
- `src/app/account/page.tsx` - Added interests field to account form

### Profile Display
- `src/app/[nickname]/page.tsx` - Added interests display to public profiles
- `src/lib/data/profiles.ts` - Added getProfileInterests function

### Gallery
- `src/lib/data/gallery.ts` - Added getPopularTagsWithMemberCounts function

### Comments
- `src/app/api/comments/route.ts` - Added event comment support with separate RPC function
- `src/components/shared/Comments.tsx` - Updated to handle event comments

### Gallery
- `src/app/gallery/page.tsx` - Added popular tags section
- `src/components/photo/JustifiedPhotoGrid.tsx` - Added profile attribution display

### Events
- `src/app/events/[eventSlug]/page.tsx` - Added EventComments component integration

### Revalidation
- `src/app/actions/revalidate.ts` - Added interests revalidation functions
- `src/app/api/revalidate-all/route.ts` - Added interests tag to bulk revalidation

### Hooks
- `src/hooks/usePhotoUpload.ts` - Added cache invalidation on photo upload
- `src/hooks/usePhotoMutations.ts` - Added tag-specific revalidation
- `src/hooks/useAlbumPhotoMutations.ts` - Added tag-specific revalidation
- `src/hooks/useGlobalInterests.ts` - New hook for global interests autocomplete

### Navigation
- `src/config/routes.ts` - Added members route
- `src/components/layout/Header.tsx` - Added members link to navigation
- `src/components/layout/MobileMenu.tsx` - Added members link to mobile menu

### Data Layer Index
- `src/lib/data/index.ts` - Added exports for interests and members modules

### Homepage
- `src/app/page.tsx` - Minor updates

### Configuration
- `vercel.json` - Added cron job configuration for event reminders
- `.env.example` - Added CRON_SECRET environment variable
- `.cursorrules` - Updated project conventions

### Documentation
- `docs/README.md` - Updated cache tags and examples
- `docs/revalidation-quick-reference.md` - Added new cache tags
- `docs/revalidation-system.md` - Updated with new revalidation patterns
- `docs/email-notifications.md` - Documentation for email notification system and cron jobs
- `README.md` - Updated features list and database tables

### Database Migrations
- `supabase/migrations/00000000000000_baseline.sql` - Consolidated baseline migration updates
- `temp_migrations/create_shared_tags_system.sql` - Updated shared tags migration

### Database Types
- `src/database.types.ts` - Regenerated to include interests, profile_interests, event_comments, and event reminder columns

### Cleanup
- Removed old temp migration files (profiles, events, events_rsvps, albums, album_tags, album_comments, manual cover)
