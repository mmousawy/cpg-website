import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Extract the object path within a bucket from a Supabase public storage URL.
 * Returns null for non-Supabase URLs or URLs from a different bucket.
 */
export function getSupabaseStorageObjectPath(
  publicUrl: string,
  bucket: string,
): string | null {
  try {
    const url = new URL(publicUrl);
    const objectPrefix = `/storage/v1/object/public/${bucket}/`;
    const renderPrefix = `/storage/v1/render/image/public/${bucket}/`;

    let objectPath: string | null = null;
    if (url.pathname.startsWith(objectPrefix)) {
      objectPath = url.pathname.slice(objectPrefix.length);
    } else if (url.pathname.startsWith(renderPrefix)) {
      objectPath = url.pathname.slice(renderPrefix.length);
    }

    if (!objectPath) {
      return null;
    }

    return decodeURIComponent(objectPath);
  } catch {
    return null;
  }
}

/** Delete a single object from Supabase storage using its public URL. */
export async function deleteSupabaseStorageObject(
  supabase: SupabaseClient,
  bucket: string,
  publicUrl: string | null | undefined,
): Promise<void> {
  if (!publicUrl || publicUrl.startsWith('blob:') || publicUrl.startsWith('data:')) {
    return;
  }

  const path = getSupabaseStorageObjectPath(publicUrl, bucket);
  if (!path) {
    return;
  }

  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    console.error(`Failed to delete storage object ${bucket}/${path}:`, error.message);
  }
}
