'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

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
 *
 * @see docs/revalidation-system.md for usage details
 */

// ============================================================================
// Event Revalidation
// ============================================================================

/**
 * Revalidate all event-related cached data
 * Use when: Creating, updating, or deleting events
 */
export async function revalidateEvents() {
  revalidateTag('events', 'max');
}

/**
 * Revalidate event attendee data only
 * Use when: RSVP signup, confirmation, or cancellation
 * More granular than revalidateEvents - doesn't refresh event details
 */
export async function revalidateEventAttendees() {
  revalidateTag('event-attendees', 'max');
}

// ============================================================================
// Album Revalidation
// ============================================================================

/**
 * Revalidate a specific album and related data
 * Use when: Updating a specific album's content (photos, metadata)
 */
export async function revalidateAlbum(nickname: string, albumSlug?: string) {
  // Revalidate all albums (appears in listings)
  revalidateTag('albums', 'max');
  // Revalidate the specific user's profile data
  revalidateTag(`profile-${nickname}`, 'max');
  // Revalidate gallery (photostream shows all public photos)
  revalidateTag('gallery', 'max');

  // Revalidate the profile page (shows albums list)
  // Note: Profile URLs use @ prefix format: /@nickname
  revalidatePath(`/@${nickname}`);

  // Also revalidate the specific album page path for any non-cached data
  if (albumSlug) {
    revalidatePath(`/@${nickname}/album/${albumSlug}`);
  }
}

/**
 * Revalidate multiple albums for a user (batch operation)
 * Use when: Bulk album operations
 */
export async function revalidateAlbums(nickname: string, _albumSlugs?: string[]) {
  // With tag-based caching, we just need to invalidate the tags
  revalidateTag('albums', 'max');
  revalidateTag(`profile-${nickname}`, 'max');
  // Revalidate gallery (photostream shows all public photos)
  revalidateTag('gallery', 'max');
  // Revalidate the profile page (shows albums list)
  // Note: Profile URLs use @ prefix format: /@nickname
  revalidatePath(`/@${nickname}`);
}

// ============================================================================
// Gallery Revalidation
// ============================================================================

/**
 * Revalidate gallery page data (photostream and tags)
 * Use when: Photo is created, updated, or deleted; tags are modified
 */
export async function revalidateGalleryData() {
  revalidateTag('gallery', 'max');
}

/**
 * Revalidate a specific tag's photo listing and member pages
 * Use when: Photos are tagged/untagged
 */
export async function revalidateTagPhotos(tagName: string) {
  revalidateTag('gallery', 'max');
  revalidateTag(`tag-${tagName}`, 'max');
  // Also revalidate members by tag page
  revalidateTag('profiles', 'max');
}

// ============================================================================
// Profile Revalidation
// ============================================================================

/**
 * Revalidate all profile-related cached data
 * Use when: Changes affect the members list on homepage
 */
export async function revalidateProfiles() {
  revalidateTag('profiles', 'max');
}

/**
 * Revalidate a specific user's profile
 * Use when: User updates their profile, creates content, etc.
 */
export async function revalidateProfile(nickname: string) {
  revalidateTag(`profile-${nickname}`, 'max');
  // Also revalidate the profiles list (homepage members)
  revalidateTag('profiles', 'max');
}

// ============================================================================
// Interests Revalidation
// ============================================================================

/**
 * Revalidate all interests-related cached data
 * Use when: Interests are added/removed from profiles
 */
export async function revalidateInterests() {
  revalidateTag('interests', 'max');
}

/**
 * Revalidate a specific interest's member listing
 * Use when: Members add/remove a specific interest
 */
export async function revalidateInterest(interestName: string) {
  revalidateTag('interests', 'max');
  revalidateTag(`interest-${interestName}`, 'max');
}

// ============================================================================
// Likes Revalidation
// ============================================================================

/**
 * Revalidate after a like/unlike on a photo
 * Use when: User likes or unlikes a photo
 */
export async function revalidatePhotoLikes(ownerNickname: string) {
  revalidateTag(`profile-${ownerNickname}`, 'max');
}

/**
 * Revalidate after a like/unlike on an album
 * Use when: User likes or unlikes an album
 */
export async function revalidateAlbumLikes(ownerNickname: string) {
  revalidateTag(`profile-${ownerNickname}`, 'max');
}

// ============================================================================
// Bulk/Utility Functions
// ============================================================================

/**
 * Revalidate all cached data (use sparingly!)
 * Use when: Admin operations that affect many pages (e.g., member suspension)
 */
export async function revalidateAll() {
  // Invalidate all cache tags
  revalidateTag('events', 'max');
  revalidateTag('event-attendees', 'max');
  revalidateTag('albums', 'max');
  revalidateTag('gallery', 'max');
  revalidateTag('profiles', 'max');
  revalidateTag('interests', 'max');
  // Also revalidate the layout for any non-cached data
  revalidatePath('/', 'layout');
}

// ============================================================================
// Legacy Compatibility (deprecated - use specific functions above)
// ============================================================================

/**
 * @deprecated Use revalidateEvents() or revalidateEventAttendees() instead
 */
export async function revalidateEvent(eventSlug?: string) {
  revalidateTag('events', 'max');
  revalidateTag('event-attendees', 'max');
  // Keep path revalidation for any non-cached content on the page
  if (eventSlug) {
    revalidatePath(`/events/${eventSlug}`);
  }
  revalidatePath('/events');
}

/**
 * @deprecated Use revalidateAlbums() or revalidateGalleryData() instead
 */
export async function revalidateGallery() {
  revalidateTag('albums', 'max');
  revalidateTag('gallery', 'max');
}
