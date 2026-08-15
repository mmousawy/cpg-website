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
