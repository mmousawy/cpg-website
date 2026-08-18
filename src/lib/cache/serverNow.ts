import { cacheLife } from 'next/cache';

/**
 * Prerender-safe server clock.
 * Date.now() cannot run in a prerendered page unless it is inside `"use cache"`.
 * Hourly refresh is enough for upcoming/past splits and deadline copy.
 */
export async function getServerNow() {
  'use cache';
  cacheLife('hourly');
  return Date.now();
}
