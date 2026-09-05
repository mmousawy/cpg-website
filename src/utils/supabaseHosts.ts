/**
 * Supabase URL / storage host helpers derived from NEXT_PUBLIC_SUPABASE_URL.
 */

const LEGACY_SUPABASE_HOSTS = [
  'db.creativephotography.group',
  'db-staging.creativephotography.group',
  'lpdjlhlslqtdswhnchmv.supabase.co',
] as const;

function normalizeHost(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** Primary Supabase API host for this deployment (from env). */
export function getSupabaseApiHost(): string | null {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!configured) return null;
  return normalizeHost(configured);
}

/** Hostnames accepted for Supabase Storage image transforms. */
export function getSupabaseStorageHosts(): string[] {
  const hosts = new Set<string>(LEGACY_SUPABASE_HOSTS);
  const apiHost = getSupabaseApiHost();
  if (apiHost) hosts.add(apiHost);
  return [...hosts];
}

/** Public object URL for a bucket path on this deployment's Supabase instance. */
export function getSupabasePublicObjectUrl(bucket: string, objectPath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const normalizedPath = objectPath.replace(/^\/+/, '');
  if (!base) {
    // Fallback for tests / misconfigured builds (production host)
    return `https://db.creativephotography.group/storage/v1/object/public/${bucket}/${normalizedPath}`;
  }
  return `${base}/storage/v1/object/public/${bucket}/${normalizedPath}`;
}
