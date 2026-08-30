'use server';

import { expireTag } from '@/lib/cache/expireTag';
import { revalidatePath, refresh } from 'next/cache';

/**
 * Cache Revalidation Actions
 *
 * Granular cache invalidation via expireTag + revalidatePath.
 * Tags are defined in src/lib/data/* and src/lib/changelog.ts.
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

/** Bust public album listings (home, gallery hub and sub-pages). */
function invalidateAlbumListingRoutes() {
  expireTag('albums');
  expireTag('search');
  expireTag('home');
  expireTag('gallery-page');
  expireTag('gallery');
  revalidatePath('/');
  revalidatePath('/gallery');
  revalidatePath('/gallery/albums');
  revalidatePath('/gallery/photos');
  revalidatePath('/gallery/recent-likes');
}

/** Bust prerendered member listing pages. */
function invalidateMemberListingRoutes() {
  revalidatePath('/members');
  revalidatePath('/members/all');
}

/** Bust prerendered challenge listings and optional challenge detail. */
function invalidateChallengeListingRoutes(challengeSlug?: string | null) {
  expireTag('challenges');
  expireTag('challenge-photos');
  expireTag('search');
  expireTag('home');
  expireTag('challenges-page');
  revalidatePath('/');
  revalidatePath('/challenges');
  if (challengeSlug) {
    expireTag(`challenge-${challengeSlug}`);
    revalidatePath(`/challenges/${challengeSlug}`);
  }
}

/** Bust prerendered scene listings and optional scene detail. */
function invalidateSceneListingRoutes(sceneSlug?: string | null) {
  expireTag('scene');
  expireTag('search');
  revalidatePath('/scene');
  if (sceneSlug) {
    expireTag(`scene-${sceneSlug}`);
    revalidatePath(`/scene/${sceneSlug}`);
  }
}

/** Bust prerendered event listings and optional event detail. */
function invalidateEventListingRoutes(eventSlug?: string | null) {
  expireTag('events');
  expireTag('event-attendees');
  expireTag('search');
  expireTag('home');
  expireTag('events-page');
  revalidatePath('/');
  revalidatePath('/events');
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
  revalidatePath('/[nickname]', 'page');
}

/** Bust cached photo detail pages across all four [photoId] route patterns. */
function invalidatePhotoRoutes(photoShortId: string, nickname?: string | null) {
  expireTag(`photo-${photoShortId}`);
  revalidatePath('/[nickname]/photo/[photoId]', 'page');
  revalidatePath('/[nickname]/album/[albumSlug]/photo/[photoId]', 'page');
  revalidatePath('/events/[eventSlug]/photo/[photoId]', 'page');
  revalidatePath('/challenges/[slug]/photo/[photoId]', 'page');
  if (nickname) {
    revalidatePath(`/@${nickname}/photo/${photoShortId}`);
  }
}

// ============================================================================
// Event Revalidation
// ============================================================================

/**
 * Revalidate all event-related cached data
 * Use when: Creating, updating, or deleting events
 */
export async function revalidateEvents(eventSlug?: string | null) {
  invalidateEventListingRoutes(eventSlug);
  finishRevalidation();
}

/**
 * Revalidate event attendee data for a specific event
 * Use when: RSVP signup, confirmation, or cancellation
 */
export async function revalidateEventAttendees(
  eventId?: number | null,
  eventSlug?: string | null,
) {
  if (eventId != null) {
    expireTag(`event-attendees-${eventId}`);
  } else {
    expireTag('event-attendees');
  }
  if (eventSlug) {
    revalidatePath(`/events/${eventSlug}`);
  }
  finishRevalidation();
}

/**
 * Revalidate a specific event by slug (granular)
 * Use when: Only a specific event detail page needs refreshing
 */
export async function revalidateEventBySlug(slug: string) {
  invalidateEventListingRoutes(slug);
  finishRevalidation();
}

/**
 * Revalidate an event album's cached data and its parent event page
 * Use when: Photos are added to or removed from an event album
 */
export async function revalidateEventAlbum(eventId: number, eventSlug?: string | null) {
  expireTag(`event-album-${eventId}`);
  expireTag('events');
  invalidateAlbumListingRoutes();
  if (eventSlug) {
    expireTag(`event-${eventSlug}`);
    revalidatePath(`/events/${eventSlug}`);
  }
  finishRevalidation();
}

/**
 * Revalidate challenge color draws
 * Use when: User draws or swaps a color
 */
export async function revalidateChallengeColorDraws(
  challengeId: string,
  challengeSlug: string,
) {
  expireTag('challenge-color-draws');
  expireTag(`challenge-color-draws-${challengeId}`);
  expireTag(`challenge-${challengeSlug}`);
  revalidatePath(`/challenges/${challengeSlug}`);
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
  revalidatePath(`/@${nickname}/album/${slug}`);
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
  eventSlugs = [],
  isPublic = false,
}: {
  nickname?: string | null;
  albumSlugs?: string[];
  eventIds?: number[];
  eventSlugs?: Array<string | null | undefined>;
  isPublic?: boolean;
}) {
  expireTag('search');

  if (isPublic || albumSlugs.length > 0 || eventIds.length > 0) {
    if (isPublic) {
      expireTag('gallery');
      expireTag('profiles');
    }
    invalidateAlbumListingRoutes();
  }

  if (nickname) {
    expireTag(`profile-${nickname}`);
    expireTag('profiles');
    invalidateProfileRoutes(nickname);
    for (const slug of albumSlugs) {
      expireTag(`album-${nickname}-${slug}`);
      revalidatePath(`/@${nickname}/album/${slug}`);
    }
  }

  for (const [index, eventId] of eventIds.entries()) {
    expireTag(`event-album-${eventId}`);
    expireTag('events');
    const eventSlug = eventSlugs[index];
    if (eventSlug) {
      expireTag(`event-${eventSlug}`);
      revalidatePath(`/events/${eventSlug}`);
    }
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
export async function revalidateGalleryData(nickname?: string | null) {
  expireTag('gallery');
  expireTag('search');
  invalidateAlbumListingRoutes();
  invalidateMemberListingRoutes();
  if (nickname) {
    expireTag(`profile-${nickname}`);
    expireTag('profiles');
    invalidateProfileRoutes(nickname);
  }
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
  revalidatePath(`/members/tag/${tagName}`);
  revalidatePath(`/gallery/tag/${tagName}`);
  invalidateMemberListingRoutes();
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
  expireTag('home');
  revalidatePath('/');
  invalidateMemberListingRoutes();
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
  expireTag('home');
  revalidatePath('/');
  invalidateMemberListingRoutes();
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
  invalidateMemberListingRoutes();
  finishRevalidation();
}

/**
 * Revalidate a specific interest's member listing
 * Use when: Members add/remove a specific interest
 */
export async function revalidateInterest(interestName: string) {
  expireTag('interests');
  expireTag(`interest-${interestName}`);
  revalidatePath(`/members/interest/${interestName}`);
  invalidateMemberListingRoutes();
  finishRevalidation();
}

// ============================================================================
// Likes Revalidation
// ============================================================================

/**
 * Revalidate after a like/unlike on a photo
 * Use when: User likes or unlikes a photo
 */
export async function revalidatePhotoLikes(
  photoId: string,
  ownerNickname: string,
  photoShortId: string,
) {
  expireTag(`photo-likes-${photoId}`);
  expireTag(`photo-${photoShortId}`);
  expireTag(`profile-${ownerNickname}`);
  expireTag('gallery');
  invalidatePhotoRoutes(photoShortId, ownerNickname);
  invalidateAlbumListingRoutes();
  invalidateProfileRoutes(ownerNickname);
  finishRevalidation();
}

/**
 * Revalidate after a like/unlike on an album
 * Use when: User likes or unlikes an album
 */
export async function revalidateAlbumLikes(
  albumId: string,
  ownerNickname: string,
  albumSlug: string,
) {
  expireTag(`album-likes-${albumId}`);
  expireTag(`album-${ownerNickname}-${albumSlug}`);
  expireTag(`profile-${ownerNickname}`);
  expireTag('gallery');
  expireTag('albums');
  revalidatePath(`/@${ownerNickname}/album/${albumSlug}`);
  invalidateAlbumListingRoutes();
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
  expireTag('events-page');
  expireTag('gallery-page');
  expireTag('challenges-page');
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
  invalidatePhotoRoutes(photoShortId, nickname);
  if (nickname) {
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
    invalidatePhotoRoutes(shortId, nickname);
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
  invalidateChallengeListingRoutes();
  finishRevalidation();
}

/**
 * Revalidate a specific challenge and its photos
 * Use when: Updating challenge details or reviewing submissions
 */
export async function revalidateChallenge(challengeSlug: string, challengeId?: string) {
  if (challengeId) {
    expireTag(`challenge-photos-${challengeId}`);
    expireTag(`challenge-color-draws-${challengeId}`);
  }
  expireTag('challenge-color-draws');
  invalidateChallengeListingRoutes(challengeSlug);
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
  expireTag('home');
  revalidatePath('/');
  finishRevalidation();
}

/**
 * Revalidate changelog cached data
 * Use when: Changelog content is updated
 */
export async function revalidateChangelog() {
  expireTag('changelog');
  revalidatePath('/changelog');
  revalidatePath('/changelog/[slug]', 'page');
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

/**
 * Revalidate profile pages after a follow/unfollow
 * Use when: User follows or unfollows another member
 */
export async function revalidateFollow(
  nicknameA?: string | null,
  nicknameB?: string | null,
) {
  expireTag('search');
  if (nicknameA) {
    expireTag(`profile-${nicknameA}`);
    invalidateProfileRoutes(nicknameA);
  }
  if (nicknameB) {
    expireTag(`profile-${nicknameB}`);
    invalidateProfileRoutes(nicknameB);
  }
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
  invalidateSceneListingRoutes();
  finishRevalidation();
}

/**
 * Revalidate a specific scene event by slug
 * Use when: Only a specific scene event detail page needs refreshing
 */
export async function revalidateSceneEvent(slug: string) {
  invalidateSceneListingRoutes(slug);
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
