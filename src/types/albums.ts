import type { Tables } from '@/database.types';

export type Album = Tables<'albums'>;
export type AlbumPhoto = Tables<'album_photos'>;
export type AlbumTag = Tables<'album_tags'>;

/** Profile fields used in shared album member/request joins */
export type SharedAlbumMemberProfile = Pick<
  Tables<'profiles'>,
  'nickname' | 'full_name' | 'avatar_url'
>;

export type SharedAlbumMember = Tables<'shared_album_members'> & {
  profiles?: SharedAlbumMemberProfile | null;
};
export type SharedAlbumRequest = Tables<'shared_album_requests'> & {
  profiles?: SharedAlbumMemberProfile | null;
};

/** Album fields used for shared album UI (join policy, event link, etc.) */
export type AlbumSharedFields = Pick<
  Tables<'albums'>,
  'id' | 'is_shared' | 'join_policy' | 'event_id' | 'max_photos_per_user' | 'user_id' | 'title'
>;

export type AlbumPhotoExtended = Tables<'album_photos'> & {
  image?: {
    exif_data?: Record<string, unknown>;
  };
};
export type AlbumWithPhotos = Album & {
  photos: AlbumPhoto[];
  tags?: AlbumTag[];
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
    nickname: string | null;
    suspended_at?: string | null;
  };
  /** Blurhash of the cover image (resolved from the cover photo) */
  cover_image_blurhash?: string | null;
  /** Cover image from the linked event (fallback when album has no cover_image_url) */
  event_cover_image?: string | null;
  // likes_count and view_count are already in Album (from Tables<'albums'>)
};

export type AlbumFormData = {
  title: string;
  slug: string;
  description: string;
  is_public: boolean;
  tags?: string[];
};

/** Valid join_policy values for shared albums (from albums.join_policy CHECK) */
export type AlbumJoinPolicy = 'open' | 'closed';

export type SharedAlbumFormData = AlbumFormData & {
  is_shared: boolean;
  join_policy: AlbumJoinPolicy | null;
  max_photos_per_user: number | null;
};

// Album like with profile info
export type AlbumLike = {
  album_id: string;
  user_id: string;
  created_at: string;
  profile?: {
    nickname: string;
    avatar_url: string | null;
    full_name: string | null;
  };
};
