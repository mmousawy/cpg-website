import { getSupabaseStorageHosts } from '@/utils/supabaseHosts';

/** Resize public Supabase images for email clients (full originals are too large). */
export function getEmailResizedImageUrl(
  src: string | null | undefined,
  width: number,
  quality = 80,
): string | undefined {
  if (!src) return undefined;

  const isSupabase = getSupabaseStorageHosts().some((host) => src.includes(host));
  if (!isSupabase) return src;

  try {
    const url = new URL(src);
    url.pathname = url.pathname.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/',
    );
    url.searchParams.set('width', String(width));
    url.searchParams.set('quality', String(quality));
    return url.toString();
  } catch {
    return src;
  }
}
