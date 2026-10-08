type PhotoForCanonical = {
  is_public?: boolean | null;
  storage_path?: string | null;
  short_id?: string | null;
};

/** Canonical path for contextual photo pages when a standalone /@owner/photo/{id} page exists. */
export function getStandalonePhotoCanonicalPath(
  ownerNickname: string,
  photo: PhotoForCanonical,
  fallbackCanonical: string,
): string {
  const shortId = photo.short_id;
  if (
    photo.is_public &&
    shortId &&
    (!photo.storage_path || !photo.storage_path.startsWith('events/'))
  ) {
    return `/@${encodeURIComponent(ownerNickname)}/photo/${encodeURIComponent(shortId)}`;
  }
  return fallbackCanonical;
}
