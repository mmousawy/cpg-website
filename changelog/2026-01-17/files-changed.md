# Files Changed - Onboarding Interests, Gallery Pagination, Likes System & Tags Display

## New Files

### Database Migrations
- `supabase/migrations/20260117000000_add_photo_album_likes.sql` - Photo and album likes tables migration
- `supabase/migrations/20260117100000_add_likes_count_columns.sql` - Likes count columns migration

### Components
- `src/components/shared/LikeButton.tsx` - Like button component with heart icon
- `src/components/shared/LikeButton.module.css` - Styles for like button
- `src/components/shared/CardLikes.tsx` - Component for displaying like counts on cards
- `src/components/shared/DetailLikesSection.tsx` - Component for showing full list of likers
- `src/components/shared/LikerAvatars.tsx` - Component for displaying avatars of users who liked
- `src/components/shared/LikesSection.tsx` - Likes section wrapper component
- `src/components/shared/Popover.tsx` - Popover component for likes detail view
- `src/components/shared/TagsSection.tsx` - Component for displaying tags on photo/album detail pages
- `src/components/shared/TagShape.tsx` - SVG component for tag pointed left edge (extracted from Tag.tsx)
- `src/components/gallery/PhotosPaginated.tsx` - Client component for infinite scroll photos
- `src/components/gallery/AlbumsPaginated.tsx` - Client component for infinite scroll albums

### Pages
- `src/app/gallery/photos/page.tsx` - Dedicated page for all recent photos with pagination
- `src/app/gallery/recent-likes/page.tsx` - Dedicated page for recently liked photos with pagination
- `src/app/gallery/albums/page.tsx` - Dedicated page for all albums with pagination

### API Routes
- `src/app/api/gallery/photos/route.ts` - API endpoint for paginated recent photos
- `src/app/api/gallery/recent-likes/route.ts` - API endpoint for paginated recently liked photos
- `src/app/api/gallery/albums/route.ts` - API endpoint for paginated albums

### Data Layer
- `src/lib/data/likes.ts` - Server-side likes data fetching functions
- `src/lib/actions/likes.ts` - Server actions for liking/unliking photos and albums

### Hooks
- `src/hooks/useLikes.ts` - Client-side hooks for likes functionality
- `src/hooks/useAuthPrompt.tsx` - Hook for authentication prompts

### Icons
- `public/icons/heart.svg` - Heart icon for unliked state
- `public/icons/heart-filled.svg` - Heart icon for liked state

### Configuration
- `.vscode/settings.json` - Switched to ESLint for formatting (removed Prettier)
- `eslint.config.mjs` - Added JSX formatting rules for props on new lines
- `package.json` - Removed Prettier, updated lint-staged to use ESLint only

## Modified Files

### Onboarding
- `src/app/onboarding/OnboardingClient.tsx` - Added interests input field, test mode support, increased form width

### Account Settings
- `src/app/account/page.tsx` - Updated to support 10 interests, integrated popular interests dropdown

### Components
- `src/components/shared/InterestInput.tsx` - Updated to show popular interests dropdown when focused
- `src/components/shared/ProfileStatsBadges.tsx` - Added likes received badge
- `src/components/shared/MemberCard.tsx` - Added "joined X ago" badge
- `src/components/shared/Tag.tsx` - Refactored: extracted SVG to TagShape, use CSS custom properties, simplified layout
- `src/components/photo/JustifiedPhotoGrid.tsx` - Fixed attribution display on profile pages
- `src/components/photo/PhotoPageContent.tsx` - Added likes functionality and tags display
- `src/components/album/AlbumCard.tsx` - Added likes functionality
- `src/components/events/EventImage.tsx` - Fixed prop types to handle href internally

### Gallery
- `src/app/gallery/page.tsx` - Added "Recently liked" section, reduced initial display to 10 items, added "View all" buttons
- `src/lib/data/gallery.ts` - Added `getRecentlyLikedPhotos` function

### Profile Pages
- `src/app/[nickname]/page.tsx` - Fixed attribution display in JustifiedPhotoGrid
- `src/app/[nickname]/album/[albumSlug]/page.tsx` - Added likes functionality
- `src/app/[nickname]/album/[albumSlug]/AlbumContent.tsx` - Added likes functionality and tags display

### Data Layer
- `src/lib/data/albums.ts` - Updated to include likes_count and tags
- `src/lib/data/index.ts` - Added likes module export
- `src/lib/data/profiles.ts` - Updated profile interests handling, added tags to photo queries

### Types
- `src/types/photos.ts` - Added PhotoLike type
- `src/types/albums.ts` - Added AlbumLike type

### Database Types
- `src/database.types.ts` - Regenerated to include photo_likes, album_likes tables and likes_count columns

### Revalidation
- `src/app/actions/revalidate.ts` - Added likes-related revalidation functions

### Other
- `src/app/page.tsx` - Minor updates
- `src/app/members/page.tsx` - Minor updates
- `src/app/members/tag/[tag]/page.tsx` - Minor updates
- Various component styling and accessibility improvements