import { connection } from 'next/server';

/**
 * Opt out of persisting this `'use cache'` loader result.
 *
 * Use before returning transient misses (404s, not-yet-published slugs, empty member
 * lists that may fill later). Without this, production can serve stale negatives for
 * the full `tagged` cache lifetime.
 */
export async function skipCacheOnMiss(): Promise<void> {
  await connection();
}

/** When aggregate metadata implies rows exist but the loaded list is empty. */
export async function skipCacheIfCountMismatch(
  expectedCount: number,
  actualLength: number,
): Promise<void> {
  if (expectedCount > 0 && actualLength === 0) {
    await skipCacheOnMiss();
  }
}

/** Return a miss value without writing it to the tagged cache. */
export async function uncachedMiss<T>(value: T): Promise<T> {
  await skipCacheOnMiss();
  return value;
}
