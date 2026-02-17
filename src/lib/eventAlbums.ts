/** Event album shape from getEventAlbum */
export type EventAlbum = {
  id: string;
  title: string;
  slug: string;
  max_photos_per_user?: number | null;
  profile?: { nickname: string | null } | null;
  photos?: Array<{
    id: string | null;
    photo_url: string | null;
    title?: string | null;
    width?: number | null;
    height?: number | null;
    added_by?: string | null;
    contributor?: {
      nickname: string | null;
      full_name: string | null;
      avatar_url: string | null;
    } | null;
    photo?: {
      id: string;
      short_id: string | null;
      url: string;
      width: number | null;
      height: number | null;
      title: string | null;
      blurhash: string | null;
      user_id: string | null;
      deleted_at: string | null;
    } | null;
  }> | null;
};

/** Check if album has any displayable photos */
export function hasEventPhotos(album: EventAlbum | null): boolean {
  return getEventPhotoCount(album) > 0;
}

/** Get count of displayable photos in event album */
export function getEventPhotoCount(album: EventAlbum | null): number {
  if (!album?.photos) return 0;
  return album.photos.filter((p) => p.photo?.id && p.photo?.url).length;
}
