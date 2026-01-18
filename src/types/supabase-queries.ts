import type { Tables } from '@/database.types';

// Album with profile join
export type AlbumWithProfile = Tables<'albums'> & {
  profile: {
    full_name: string | null;
    nickname: string | null;
    avatar_url: string | null;
    suspended_at?: string | null;
  } | null;
};

// Album with photos and profile
export type AlbumWithPhotosAndProfile = AlbumWithProfile & {
  photos: Array<{
    id: string;
    photo_url: string;
    title?: string | null;
    width?: number | null;
    height?: number | null;
    sort_order?: number | null;
  }>;
  tags?: Array<{ tag: string }>;
  likes_count?: number;
  view_count?: number;
};

// Photo with profile join
export type PhotoWithProfile = Tables<'photos'> & {
  profiles: {
    nickname: string | null;
    avatar_url: string | null;
    full_name: string | null;
  } | null;
  likes_count?: number;
  view_count?: number;
};

// Album photo with album join
export type AlbumPhotoWithAlbum = Tables<'album_photos'> & {
  albums: {
    id: string;
    title: string;
    slug: string;
    user_id: string;
    profile?: {
      nickname: string | null;
    } | null;
  } | null;
};
