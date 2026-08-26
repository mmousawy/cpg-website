import { revalidatePath, revalidateTag, updateTag } from 'next/cache';

/**
 * Immediately expire a cache tag.
 * Server Actions must use updateTag (read-your-own-writes). revalidateTag in
 * an action can leave other instances serving stale content on production.
 * Route Handlers cannot call updateTag, so they fall back to expire: 0.
 */
export function expireTag(tag: string): void {
  try {
    updateTag(tag);
  } catch {
    revalidateTag(tag, { expire: 0 });
  }
}

/** Immediately expire multiple cache tags. */
export function expireTags(tags: string[]): void {
  for (const tag of tags) {
    expireTag(tag);
  }
}

/** Mark the prerendered homepage stale; next visit serves cached HTML while revalidating in the background. */
export function revalidateHomeCache(): void {
  revalidateTag('home', 'home');
}

/** Mark the prerendered events listing stale (SWR). */
export function revalidateEventsPageCache(): void {
  revalidateTag('events-page', 'eventsPage');
}

/** Mark the prerendered gallery listing stale (SWR). */
export function revalidateGalleryPageCache(): void {
  revalidateTag('gallery-page', 'galleryPage');
}

/** Mark the prerendered challenges listing stale (SWR). */
export function revalidateChallengesPageCache(): void {
  revalidateTag('challenges-page', 'challengesPage');
}

/** Mark changelog caches stale (SWR). */
export function revalidateChangelogCache(): void {
  revalidateTag('changelog', 'changelog');
}

/** Expire caches that include the homepage / members listings. */
export function expireMemberListCaches(nickname?: string | null): void {
  expireTag('profiles');
  expireTag('search');
  revalidateHomeCache();
  expireTag('interests');
  if (nickname) {
    expireTag(`profile-${nickname}`);
    revalidatePath(`/@${nickname}`);
    revalidatePath(`/@${nickname}/albums`);
    revalidatePath(`/@${nickname}/photos`);
    revalidatePath('/[nickname]', 'layout');
  }
}
