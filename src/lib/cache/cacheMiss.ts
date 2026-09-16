/**
 * `connection()` cannot run inside `'use cache'` (including at build/prerender time).
 *
 * Pattern for slug/detail loaders:
 * 1. Uncached lightweight existence check (or live metadata).
 * 2. Return miss immediately without entering the cached loader.
 * 3. Call the cached loader only when the row should exist.
 *
 * For stale empty lists vs. positive counts, compare live metadata in the
 * uncached wrapper and bypass the cache when counts disagree.
 */
