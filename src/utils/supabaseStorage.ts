export type UserStorageBucket = 'user-photos' | 'user-banners' | 'user-avatars' | 'email-assets';

export const USER_STORAGE_BUCKETS = new Set<string>([
  'user-photos',
  'user-banners',
  'user-avatars',
  'email-assets',
]);

export function isSafeUserStoragePath(userId: string, filePath: string): boolean {
  if (!filePath || filePath.includes('..') || filePath.includes('\\')) {
    return false;
  }
  const normalized = filePath.replace(/^\/+/, '');
  return normalized.startsWith(`${userId}/`);
}

/**
 * Upload a file via the server API (service role) so storage RLS does not
 * block authenticated client inserts.
 */
export async function uploadUserStorageFile(
  bucket: UserStorageBucket,
  filePath: string,
  file: File,
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', bucket);
  formData.append('path', filePath);

  const response = await fetch('/api/photos/upload', {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json().catch(() => ({})) as {
    publicUrl?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error || 'Upload failed');
  }

  if (!payload.publicUrl) {
    throw new Error('Upload failed: missing public URL');
  }

  return payload.publicUrl;
}

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

/** Delete objects from Supabase storage via the service-role API. */
export async function deleteUserStorageFiles(
  bucket: UserStorageBucket,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) {
    return;
  }

  const response = await fetch('/api/photos/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucket, paths }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    console.error(
      `Failed to delete storage objects from ${bucket}:`,
      payload.error || response.statusText,
    );
  }
}

/** Delete a single object from Supabase storage using its public URL. */
export async function deleteSupabaseStorageObject(
  bucket: UserStorageBucket,
  publicUrl: string | null | undefined,
): Promise<void> {
  if (!publicUrl || publicUrl.startsWith('blob:') || publicUrl.startsWith('data:')) {
    return;
  }

  const path = getSupabaseStorageObjectPath(publicUrl, bucket);
  if (!path) {
    return;
  }

  await deleteUserStorageFiles(bucket, [path]);
}
