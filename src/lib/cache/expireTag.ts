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

/**
 * Member discovery by shooting format and daily driver (`getGroupedMemberGearDiscovery`).
 * Pair with `user-gear` on gear profile saves; also called from member listing revalidation.
 */
export function expireMemberGearDiscoveryCaches(): void {
  expireTag('user-gear');
  revalidatePath('/members');
  revalidatePath('/members/all');
  revalidatePath('/members/format/[format]', 'page');
  revalidatePath('/members/camera/[name]', 'page');
  revalidatePath('/members/lens/[name]', 'page');
}

/** Expire caches that include the homepage / members listings. */
export function expireMemberListCaches(nickname?: string | null): void {
  expireTag('profiles');
  expireTag('search');
  expireTag('home');
  revalidatePath('/');
  expireTag('interests');
  expireMemberGearDiscoveryCaches();
  if (nickname) {
    expireTag(`profile-${nickname}`);
    revalidatePath(`/@${nickname}`);
    revalidatePath(`/@${nickname}/albums`);
    revalidatePath(`/@${nickname}/photos`);
    revalidatePath('/[nickname]', 'layout');
    revalidatePath('/[nickname]', 'page');
  }
}
