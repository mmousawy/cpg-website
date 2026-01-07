import type { Tables } from '@/database.types';

export type Photo = Tables<'photos'>;

export type PhotoWithAlbums = Photo & {
  albums?: { id: string; title: string; slug: string }[];
};

// Extended photo with EXIF (matches AlbumPhotoExtended pattern)
export type PhotoExtended = Photo & {
  exif_data?: Record<string, unknown>;
};

// For cursor-based pagination
export type PhotosPage = {
  photos: Photo[];
  nextCursor: string | null; // created_at of last item
  hasMore: boolean;
};

// Photo form data for editing
export type PhotoFormData = {
  title: string | null;
  description: string | null;
  is_public: boolean;
  sort_order: number | null;
};

