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
 * - 'profiles' - All profile data (organizers, members list)
 * - 'profile-[nickname]' - Specific user profile data
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
  // Revalidate the profile page (shows albums list)
  // Note: Profile URLs use @ prefix format: /@nickname
  revalidatePath(`/@${nickname}`);
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
  revalidateTag('profiles', 'max');
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
 * @deprecated Use revalidateAlbums() instead
 */
export async function revalidateGallery() {
  revalidateTag('albums', 'max');
}
