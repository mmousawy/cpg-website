/**
 * Cached data layer for server components
 *
 * All exports use the `use cache` directive with `cacheTag` for granular invalidation.
 * When data changes, use `revalidateTag()` to invalidate specific cached data.
 *
 * Available tags:
 * - 'events' - All event data
 * - 'event-attendees' - RSVP/attendee data (separate from events for more granular control)
 * - 'albums' - All album data
 * - 'profiles' - All profile data (organizers, members)
 * - 'profile-[nickname]' - Specific user profile data
 *
 * @see docs/revalidation-system.md for usage details
 */

export * from './events';
export * from './albums';
export * from './profiles';
