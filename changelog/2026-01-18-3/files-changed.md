# Files Changed - Code Quality & Type Safety

## New Files

### Type Definitions
- `src/types/supabase-queries.ts` - Typed Supabase query result types for joins (AlbumWithProfile, AlbumWithPhotosAndProfile, PhotoWithProfile, AlbumPhotoWithAlbum)

## Modified Files

### Type Safety Improvements

#### Data Layer (`src/lib/data/`)
- `albums.ts` - Remove `as any` casts, use proper query types
- `profiles.ts` - Type album photo joins properly
- `gallery.ts` - Type photo tag joins
- `members.ts` - Type photo tag joins
- `likes.ts` - Type album profile joins

#### Actions (`src/lib/actions/`)
- `likes.ts` - Type album profile joins

#### Hooks (`src/hooks/`)
- `useAlbums.ts` - Remove `as any` casts, add proper query types
- `useAlbumPhotos.ts` - Type album photo queries properly
- `usePhotos.ts` - Type photo album joins
- `useAccountForm.ts` - Remove `as any` cast for newsletter_opt_in

#### Components

**Form Components:**
- `src/components/onboarding/OnboardingProfileSection.tsx` - Type react-hook-form props
- `src/components/onboarding/OnboardingNicknameSection.tsx` - Type react-hook-form props
- `src/components/onboarding/OnboardingInterestsSection.tsx` - Type react-hook-form props
- `src/components/onboarding/OnboardingEmailPreferencesSection.tsx` - Type react-hook-form props
- `src/components/account/PreferencesSection.tsx` - Type react-hook-form props
- `src/components/manage/SingleAlbumEditForm.tsx` - Type album tags properly
- `src/components/manage/BulkAlbumEditForm.tsx` - Replace `catch (err: any)` with proper error handling
- `src/components/manage/SinglePhotoEditForm.tsx` - Replace `catch (err: any)` with proper error handling
- `src/components/manage/BulkPhotoEditForm.tsx` - Replace `catch (err: any)` with proper error handling

**Shared Components:**
- `src/components/shared/Comments.tsx` - Type comment query results
- `src/components/shared/Tooltip.tsx` - Remove `as any` casts, fix ref forwarding
- `src/components/shared/DetailLikesSection.tsx` - Consolidate eslint-disable comments
- `src/components/admin/RecipientList.tsx` - Type Recipient index signature properly
- `src/components/admin/EventCoverUpload.tsx` - Fix error callback type

**Photo/Album Components:**
- `src/components/photo/PhotoPageContent.tsx` - Remove `as any` casts for likes_count/view_count
- `src/components/photo/JustifiedPhotoGrid.tsx` - Remove `as any` cast for likes_count
- `src/components/album/AlbumCard.tsx` - Remove `as any` cast, fix likesCount to likes_count
- `src/components/album/AlbumGrid.tsx` - Remove `as any` cast for likes_count

#### Pages

**App Pages:**
- `src/app/[nickname]/album/[albumSlug]/AlbumContent.tsx` - Remove `as any` casts
- `src/app/[nickname]/album/[albumSlug]/page.tsx` - Type album photos properly
- `src/app/[nickname]/photo/[photoId]/page.tsx` - Remove `as any` casts
- `src/app/account/(manage)/albums/[slug]/AlbumDetailClient.tsx` - Remove `as any` cast
- `src/app/account/(manage)/albums/[slug]/AlbumDetailClient.tsx` - Replace `catch (err: any)` with proper error handling
- `src/app/account/(manage)/photos/page.tsx` - Replace `catch (err: any)` with proper error handling
- `src/app/account/upload/page.tsx` - Replace `catch (err: any)` with proper error handling
- `src/app/admin/events/attendance/[eventId]/page.tsx` - Type event state properly
- `src/app/admin/events/[eventId]/page.tsx` - Fix exhaustive-deps
- `src/app/admin/events/page.tsx` - Fix exhaustive-deps
- `src/app/sitemap.ts` - Type photo profile joins properly
- `src/app/email/[template]/page.tsx` - Type email template imports

**API Routes:**
- `src/app/api/comments/route.ts` - Remove `as any` casts, type album joins
- `src/app/api/gallery/albums/route.ts` - Type album query results
- `src/app/api/admin/albums/suspend/route.ts` - Remove unnecessary `as any` cast
- `src/app/api/admin/albums/unsuspend/route.ts` - Remove unnecessary `as any` cast
- `src/app/api/admin/events/announce/route.ts` - Type Resend error responses
- `src/app/api/admin/events/email-attendees/route.ts` - Type Resend error responses
- `src/app/api/cron/event-reminders/route.ts` - Type Resend batch results

#### Context & Hooks
- `src/context/AuthContext.tsx` - Type auth error responses properly
- `src/context/UnsavedChangesContext.tsx` - Add Window interface declaration
- `src/hooks/useFormChanges.ts` - Improve eslint-disable comment explanation
- `src/hooks/useAlbumPhotoMutations.ts` - Type queryClient.getQueryData properly

#### Utils
- `src/utils/emailPreferences.ts` - Remove `as any` casts from Supabase queries
- `src/utils/emailPreferencesClient.ts` - Remove `as any` casts, type map callbacks

#### Types
- `src/types/albums.ts` - Update exif_data type from `any` to `Record<string, unknown>`

#### Tests
- `src/__tests__/utils/test-helpers.ts` - Type TestUser properly

#### Components (ESLint Fixes)
- `src/components/manage/AlbumPicker.tsx` - Fix exhaustive-deps by moving function inside useEffect
- `src/components/manage/AddToAlbumContent.tsx` - Fix exhaustive-deps
- `src/components/manage/AddPhotosToAlbumModal.tsx` - Fix exhaustive-deps
- `src/components/admin/MemberTable.tsx` - Replace <img> with Next.js <Image>
- `src/app/events/[eventSlug]/page.tsx` - Replace <img> with Next.js <Image>`
