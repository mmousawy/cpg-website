import { revalidateTag } from 'next/cache';

/** Immediately expire a cache tag (works in Server Actions and Route Handlers). */
export function expireTag(tag: string): void {
  revalidateTag(tag, { expire: 0 });
}

/** Immediately expire multiple cache tags. */
export function expireTags(tags: string[]): void {
  for (const tag of tags) {
    expireTag(tag);
  }
}

/** Expire caches that include the homepage / members listings. */
export function expireMemberListCaches(nickname?: string | null): void {
  expireTag('profiles');
  expireTag('search');
  expireTag('home');
  expireTag('interests');
  if (nickname) {
    expireTag(`profile-${nickname}`);
  }
}

