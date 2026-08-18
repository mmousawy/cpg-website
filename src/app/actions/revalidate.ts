'use server';

import { expireTag } from '@/lib/cache/expireTag';
import { revalidatePath, refresh } from 'next/cache';

/**
 * Cache Revalidation Actions
 *
 * This module provides granular cache invalidation using Next.js revalidateTag.
 * Each function invalidates specific cached data, not entire pages.
 *
 * Available cache tags (defined in src/lib/data/):
 * - 'events' - All event data
 * - 'event-attendees' - RSVP/attendee data
 * - 'albums' - All album data
 * - 'gallery' - Community photostream and tag data
 * - 'profiles' - All profile data (organizers, members list)
 * - 'profile-[nickname]' - Specific user profile data
 * - 'tag-[tagname]' - Photos with a specific tag
 * - 'interests' - All interests data
 * - 'interest-[name]' - Members with a specific interest
 * - 'challenges' - All challenge data
 * - 'challenge-photos' - Accepted photos in challenges
 * - 'search' - Search results cache
 * - 'reports' - Reports data
 *
 * @see docs/revalidation-system.md for usage details
 */

function finishRevalidation() {
  try {
    refresh();
  } catch {
    // refresh() only works inside Server Actions. Route handlers rely on
    // expireTag() above; callers that need a client update use router.refresh().
  }
}

/** Invalidate the homepage shell. */
function invalidateHomeTag() {
  expireTag('home');
  revalidatePath('/');
}

/** Bust public album listings (home, gallery, gallery/albums). */
function invalidateAlbumListingRoutes() {
  expireTag('albums');
  invalidateHomeTag();
  revalidatePath('/gallery');
  revalidatePath('/gallery/albums');
}

/** Bust prerendered event listings and optional event detail. */
function invalidateEventListingRoutes(eventSlug?: string | null) {
  expireTag('events');
  expireTag('event-attendees');
  invalidateHomeTag();
  revalidatePath('/events');
  revalidatePath('/events/[eventSlug]', 'page');
  if (eventSlug) {
    expireTag(`event-${eventSlug}`);
    revalidatePath(`/events/${eventSlug}`);
  }
}

/** Bust prerendered profile routes (/@nickname and nested pages). */
function invalidateProfileRoutes(nickname: string) {
  expireTag(`profile-${nickname}`);
  expireTag('albums');
  revalidatePath(`/@${nickname}`);
  revalidatePath(`/@${nickname}/albums`);
  revalidatePath(`/@${nickname}/photos`);
  revalidatePath('/[nickname]', 'layout');
}

/** Bust prerendered gallery/members tag listing pages. */
function invalidateTagListingRoutes(tagName: string) {
  const encodedTag = encodeURIComponent(tagName);
  revalidatePath(`/gallery/tag/${encodedTag}`);
  revalidatePath(`/members/tag/${encodedTag}`);
}

// ============================================================================
// Event Revalidation
// ============================================================================

/**
 * Revalidate all event-related cached data
 * Use when: Creating, updating, or deleting events
 */
export async function revalidateEvents() {
  expireTag('search');
  invalidateEventListingRoutes();
  finishRevalidation();
}

/**
 * Revalidate event attendee data and prerendered event pages
 * Use when: RSVP signup, confirmation, or cancellation
 */
export async function revalidateEventAttendees(eventSlug?: string | null) {
  invalidateEventListingRoutes(eventSlug);
  finishRevalidation();
}

/**
 * Revalidate a specific event by slug (granular)
 * Use when: Only a specific event detail page needs refreshing
 */
export async function revalidateEventBySlug(slug: string) {
  expireTag(`event-${slug}`);
  expireTag('events');
  revalidatePath(`/events/${slug}`);
  revalidatePath('/events');
  finishRevalidation();
}

/**
 * Revalidate an event album's cached data and its parent event page
 * Use when: Photos are added to or removed from an event album
 */
export async function revalidateEventAlbum(eventId: number) {
  expireTag(`event-album-${eventId}`);
  expireTag('events');
  invalidateAlbumListingRoutes();
  finishRevalidation();
}

/**
 * Revalidate challenge color draws
 * Use when: User draws or swaps a color
 */
export async function revalidateChallengeColorDraws(challengeId: string) {
  expireTag('challenge-color-draws');
  expireTag(`challenge-color-draws-${challengeId}`);
  revalidatePath('/challenges/[slug]', 'page');
  finishRevalidation();
}

// ============================================================================
// Album Revalidation
// ============================================================================

/**
 * Revalidate a specific album and related data
 * Use when: Updating a specific album's content (photos, metadata)
 */
export async function revalidateAlbum(nickname: string, albumSlug?: string) {
  expireTag(`profile-${nickname}`);
  expireTag('search');
  invalidateAlbumListingRoutes();

  if (albumSlug) {
    expireTag(`album-${nickname}-${albumSlug}`);
    revalidatePath(`/@${nickname}/album/${albumSlug}`);
  }

  invalidateProfileRoutes(nickname);
  finishRevalidation();
}

/**
 * Revalidate a specific album by slug (granular - only the album page, not listings)
 * Use when: Only the album detail page needs refreshing (e.g., comment added)
 */
export async function revalidateAlbumBySlug(nickname: string, slug: string) {
  expireTag(`album-${nickname}-${slug}`);
  expireTag(`profile-${nickname}`);
  invalidateProfileRoutes(nickname);
  finishRevalidation();
}

/**
 * Revalidate multiple albums for a user (batch operation)
 * Use when: Bulk album operations
 */
export async function revalidateAlbums(nickname: string, albumSlugs?: string[]) {
  expireTag(`profile-${nickname}`);
  expireTag('search');
  invalidateAlbumListingRoutes();

  if (albumSlugs) {
    for (const slug of albumSlugs) {
      expireTag(`album-${nickname}-${slug}`);
      revalidatePath(`/@${nickname}/album/${slug}`);
    }
  }

  invalidateProfileRoutes(nickname);
  finishRevalidation();
}

/**
 * One-shot invalidation after a photo upload batch.
 * Covers gallery, profile, albums, event albums, and the homepage shell.
 */
export async function revalidateAfterPhotoUpload({
  nickname,
  albumSlugs = [],
  eventIds = [],
  isPublic = false,
}: {
  nickname?: string | null;
  albumSlugs?: string[];
  eventIds?: number[];
  isPublic?: boolean;
}) {
  if (isPublic) {
    expireTag('gallery');
    expireTag('profiles');
    expireTag('search');
    invalidateHomeTag();
  }

  if (nickname && (isPublic || albumSlugs.length > 0 || eventIds.length > 0)) {
    expireTag(`profile-${nickname}`);
    expireTag('profiles');
  }

  if (albumSlugs.length > 0 || eventIds.length > 0) {
    expireTag('search');
    invalidateAlbumListingRoutes();
  }

  if (nickname) {
    for (const slug of albumSlugs) {
      expireTag(`album-${nickname}-${slug}`);
      revalidatePath(`/@${nickname}/album/${slug}`);
    }
  }

  for (const eventId of eventIds) {
    expireTag(`event-album-${eventId}`);
    expireTag('events');
  }

  if (nickname) {
    invalidateProfileRoutes(nickname);
  }

  finishRevalidation();
}

// ============================================================================
// Gallery Revalidation
// ============================================================================

/**
 * Revalidate gallery page data (photostream and tags)
 * Use when: Photo is created, updated, or deleted; tags are modified
 */
export async function revalidateGalleryData() {
  expireTag('gallery');
  expireTag('search');
  invalidateHomeTag();
  finishRevalidation();
}

/**
 * Revalidate a specific tag's photo listing and member pages
 * Use when: Photos are tagged/untagged
 */
export async function revalidateTagPhotos(tagName: string) {
  expireTag('gallery');
  expireTag(`tag-${tagName}`);
  expireTag('search');
  invalidateHomeTag();
  invalidateTagListingRoutes(tagName);
  finishRevalidation();
}

// ============================================================================
// Profile Revalidation
// ============================================================================

/**
 * Revalidate all profile-related cached data
 * Use when: Changes affect the members list on homepage
 */
export async function revalidateProfiles() {
  expireTag('profiles');
  expireTag('search');
  invalidateHomeTag();
  finishRevalidation();
}

/**
 * Revalidate a specific user's profile
 * Use when: User updates their profile, creates content, etc.
 */
export async function revalidateProfile(nickname: string) {
  expireTag(`profile-${nickname}`);
  expireTag('profiles');
  expireTag('search');
  invalidateHomeTag();
  // Profile pages are prerendered via generateStaticParams; tag expiry alone
  // does not bust that route payload (unlike nested data-function caches).
  invalidateProfileRoutes(nickname);
  finishRevalidation();
}

// ============================================================================
// Interests Revalidation
// ============================================================================

/**
 * Revalidate all interests-related cached data
 * Use when: Interests are added/removed from profiles
 */
export async function revalidateInterests() {
  expireTag('interests');
  finishRevalidation();
}

/**
 * Revalidate a specific interest's member listing
 * Use when: Members add/remove a specific interest
 */
export async function revalidateInterest(interestName: string) {
  expireTag('interests');
  expireTag(`interest-${interestName}`);
  revalidatePath(`/members/interest/${encodeURIComponent(interestName)}`);
  finishRevalidation();
}

// ============================================================================
// Likes Revalidation
// ============================================================================

/**
 * Revalidate after a like/unlike on a photo
 * Use when: User likes or unlikes a photo
 */
export async function revalidatePhotoLikes(photoId: string, ownerNickname: string) {
  expireTag(`photo-likes-${photoId}`);
  expireTag(`profile-${ownerNickname}`);
  expireTag('gallery');
  invalidateHomeTag();
  invalidateProfileRoutes(ownerNickname);
  finishRevalidation();
}

/**
 * Revalidate after a like/unlike on an album
 * Use when: User likes or unlikes an album
 */
export async function revalidateAlbumLikes(albumId: string, ownerNickname: string) {
  expireTag(`album-likes-${albumId}`);
  expireTag(`profile-${ownerNickname}`);
  expireTag('gallery');
  invalidateHomeTag();
  invalidateProfileRoutes(ownerNickname);
  finishRevalidation();
}

// ============================================================================
// Bulk/Utility Functions
// ============================================================================

/**
 * Revalidate all cached data (use sparingly!)
 * Use when: Admin operations that affect many pages (e.g., member suspension)
 */
export async function revalidateAll() {
  expireTag('events');
  expireTag('event-attendees');
  expireTag('albums');
  expireTag('gallery');
  expireTag('profiles');
  expireTag('interests');
  expireTag('challenges');
  expireTag('challenge-photos');
  expireTag('search');
  expireTag('scene');
  expireTag('home');
  expireTag('changelog');
  revalidatePath('/', 'layout');
  finishRevalidation();
}

// ============================================================================
// Photo Revalidation
// ============================================================================

/**
 * Revalidate a specific photo's cached data
 * Use when: Photo metadata changes, challenge submission status changes
 */
export async function revalidatePhoto(photoShortId: string, nickname?: string | null) {
  expireTag(`photo-${photoShortId}`);
  if (nickname) {
    revalidatePath(`/@${nickname}/photo/${photoShortId}`);
    invalidateProfileRoutes(nickname);
  }
  finishRevalidation();
}

/**
 * Revalidate multiple photos (batch operation)
 * Use when: Bulk reviewing challenge submissions
 */
export async function revalidatePhotos(photoShortIds: string[], nickname?: string | null) {
  for (const shortId of photoShortIds) {
    expireTag(`photo-${shortId}`);
    if (nickname) {
      revalidatePath(`/@${nickname}/photo/${shortId}`);
    }
  }
  if (nickname) {
    invalidateProfileRoutes(nickname);
  }
  finishRevalidation();
}

// ============================================================================
// Challenge Revalidation
// ============================================================================

/**
 * Revalidate all challenge-related cached data
 * Use when: Creating, updating, or deleting challenges
 */
export async function revalidateChallenges() {
  expireTag('challenges');
  expireTag('challenge-photos');
  invalidateHomeTag();
  revalidatePath('/challenges');
  revalidatePath('/challenges/[slug]', 'page');
  finishRevalidation();
}

/**
 * Revalidate a specific challenge and its photos
 * Use when: Updating challenge details or reviewing submissions
 */
export async function revalidateChallenge(challengeSlug: string, challengeId?: string) {
  expireTag(`challenge-${challengeSlug}`);
  expireTag('challenges');
  if (challengeId) {
    expireTag(`challenge-photos-${challengeId}`);
    expireTag(`challenge-color-draws-${challengeId}`);
  }
  expireTag('challenge-photos');
  expireTag('challenge-color-draws');
  invalidateHomeTag();
  revalidatePath(`/challenges/${challengeSlug}`);
  finishRevalidation();
}

// ============================================================================
// Home & Changelog Revalidation
// ============================================================================

/**
 * Revalidate home page cached data
 * Use when: Content changes affect the homepage
 */
export async function revalidateHome() {
  invalidateHomeTag();
  finishRevalidation();
}

/**
 * Revalidate changelog cached data
 * Use when: Changelog content is updated
 */
export async function revalidateChangelog() {
  expireTag('changelog');
  revalidatePath('/changelog');
  revalidatePath('/changelog/details');
  finishRevalidation();
}

// ============================================================================
// Search Revalidation
// ============================================================================

/**
 * Revalidate search results cache
 * Use when: Content changes that affect search results
 * Note: This is automatically called by other revalidation functions
 */
export async function revalidateSearch() {
  expireTag('search');
  finishRevalidation();
}

// ============================================================================
// Legacy Compatibility (deprecated - use specific functions above)
// ============================================================================

/**
 * @deprecated Use revalidateEvents() or revalidateEventAttendees() instead
 */
export async function revalidateEvent(eventSlug?: string) {
  expireTag('events');
  expireTag('event-attendees');
  if (eventSlug) {
    revalidatePath(`/events/${eventSlug}`);
  }
  revalidatePath('/events');
  finishRevalidation();
}

/**
 * @deprecated Use revalidateAlbums() or revalidateGalleryData() instead
 */
export async function revalidateGallery() {
  expireTag('albums');
  expireTag('gallery');
  finishRevalidation();
}

// ============================================================================
// Reports Revalidation
// ============================================================================

/**
 * Revalidate reports data
 * Use when: Resolving or dismissing reports
 */
export async function revalidateReports() {
  expireTag('reports');
  finishRevalidation();
}

// ============================================================================
// Scene Revalidation
// ============================================================================

/**
 * Revalidate all scene-related cached data
 * Use when: Creating, updating, or soft-deleting scene events
 */
export async function revalidateScene() {
  expireTag('scene');
  expireTag('search');
  revalidatePath('/scene');
  finishRevalidation();
}

/**
 * Revalidate a specific scene event by slug
 * Use when: Only a specific scene event detail page needs refreshing
 */
export async function revalidateSceneEvent(slug: string) {
  expireTag(`scene-${slug}`);
  expireTag('scene');
  revalidatePath(`/scene/${slug}`);
  revalidatePath('/scene/[slug]', 'page');
  finishRevalidation();
}

// ============================================================================
// Feedback Revalidation
// ============================================================================

/**
 * Revalidate feedback data
 * Use when: Updating feedback status or admin notes
 */
export async function revalidateFeedback() {
  expireTag('feedback');
  finishRevalidation();
}
