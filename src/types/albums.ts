import type { Tables } from '@/database.types';

export type Album = Tables<'albums'>
export type AlbumPhoto = Tables<'album_photos'>
export type AlbumTag = Tables<'album_tags'>

export type AlbumPhotoExtended = Tables<'album_photos'> & {
  image?: {
    exif_data?: any;
  };
};
export type AlbumWithPhotos = Album & {
  photos: AlbumPhoto[]
  tags?: AlbumTag[]
  profile?: {
    full_name: string | null
    avatar_url: string | null
    nickname: string | null
  }
}

export type AlbumFormData = {
  title: string
  slug: string
  description: string
  is_public: boolean
  tags?: string[]
}

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
