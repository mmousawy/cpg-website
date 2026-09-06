/**
 * Next.js cacheComponents requires every generateStaticParams to return ≥1 entry
 * at build time. Empty databases (e.g. fresh staging) use a placeholder route
 * that 404s at runtime but satisfies build validation.
 */
export function ensureStaticParams<T extends Record<string, string>>(
  params: T[],
  fallback: T,
): T[] {
  return params.length > 0 ? params : [fallback];
}
