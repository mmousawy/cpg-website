import type { AlbumWithPhotos } from '@/types/albums';

/** Fields needed to label an album in UI. */
export type AlbumDisplayNameSource = Pick<AlbumWithPhotos, 'id'> & {
  title?: string | null;
  slug?: string | null;
  event_title?: string | null;
};

/** Fields needed to resolve an album thumbnail. */
export type AlbumCoverSource = {
  cover_image_url?: string | null;
  photos?: Array<{ photo_url?: string | null }> | null;
  event_cover_image?: string | null;
};

/**
 * Label for an album in UI.
 * Event albums store an internal title (`{event} Photos`); always show the event name instead.
 */
export function getAlbumDisplayName(album: AlbumDisplayNameSource): string {
  if (album.event_title) return album.event_title;
  if (album.title) return album.title;
  if (album.slug) return album.slug;
  return album.id.slice(0, 8);
}

/** Album cover, first photo, then linked event cover for event albums with no photos yet. */
export function getAlbumCoverUrl(album: AlbumCoverSource): string | null {
  return album.cover_image_url || album.photos?.[0]?.photo_url || album.event_cover_image || null;
}
