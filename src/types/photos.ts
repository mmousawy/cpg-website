import type { Tables } from '@/database.types';

export type Photo = Tables<'photos'>;
export type PhotoTag = Tables<'photo_tags'>;
export type Tag = Tables<'tags'>;

export type PhotoAlbumInfo = {
  id: string;
  title: string;
  slug: string;
  cover_image_url: string | null;
  profile_nickname: string | null;
  photo_count?: number;
};

export type PhotoChallengeInfo = {
  id: string;
  title: string;
  slug: string;
  cover_image_url: string | null;
  status: 'accepted' | 'pending' | 'rejected';
};

/** Simplified tag object returned from queries (only need the tag name) */
export type SimpleTag = { tag: string };

export type PhotoWithAlbums = Photo & {
  albums?: PhotoAlbumInfo[];
  challenges?: PhotoChallengeInfo[];
  tags?: SimpleTag[];
  /** When viewing within an album context, this is the album_photos.id for that relationship */
  album_photo_id?: string;
  /** The album_photos.sort_order when in album context */
  album_sort_order?: number;
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

// Photo like with profile info
export type PhotoLike = {
  photo_id: string;
  user_id: string;
  created_at: string;
  profile?: {
    nickname: string;
    avatar_url: string | null;
    full_name: string | null;
  };
};
