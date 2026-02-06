import type { Tables } from '@/database.types';
import type { AlbumWithPhotos } from '@/types/albums';
import { supabase } from '@/utils/supabase/client';
import { useQuery } from '@tanstack/react-query';

async function fetchAlbums(userId: string): Promise<AlbumWithPhotos[]> {

  const { data, error } = await supabase
    .from('albums')
    .select(`
      id,
      title,
      description,
      slug,
      cover_image_url,
      is_public,
      created_at,
      user_id,
      photos:album_photos(
        id,
        photo_url,
        photo:photos!album_photos_photo_id_fkey(deleted_at, blurhash)
      ),
      tags:album_tags(tag)
    `)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message || 'Failed to fetch albums');
  }

  type AlbumPhotoRow = Pick<Tables<'album_photos'>, 'id' | 'photo_url'>;
  type PhotoRow = Pick<Tables<'photos'>, 'deleted_at' | 'blurhash'>;
  type AlbumPhotoWithPhoto = AlbumPhotoRow & {
    photo: PhotoRow | null;
  };

  type AlbumRow = Pick<Tables<'albums'>, 'id' | 'title' | 'description' | 'slug' | 'cover_image_url' | 'is_public' | 'created_at' | 'user_id'>;
  type AlbumQueryResult = AlbumRow & {
    photos: AlbumPhotoWithPhoto[] | null;
    tags: Array<{ tag: string }> | null;
  };

  // Filter out deleted photos from albums and resolve cover image blurhash
  const albumsWithFilteredPhotos = (data || []).map((album: AlbumQueryResult) => {
    const activePhotos = (album.photos || []).filter((ap) => !ap.photo?.deleted_at);

    // Resolve blurhash for the cover image
    const coverUrl = album.cover_image_url || activePhotos[0]?.photo_url;
    const coverPhoto = coverUrl
      ? activePhotos.find((ap) => ap.photo_url === coverUrl)
      : activePhotos[0];
    const cover_image_blurhash = coverPhoto?.photo?.blurhash || null;

    return {
      ...album,
      photos: activePhotos,
      cover_image_blurhash,
    };
  });

  return albumsWithFilteredPhotos as unknown as AlbumWithPhotos[];
}

export function useAlbums(userId: string | undefined) {
  return useQuery({
    queryKey: ['albums', userId],
    queryFn: () => fetchAlbums(userId!),
    enabled: !!userId,
  });
}

async function fetchAlbumBySlug(userId: string, slug: string): Promise<AlbumWithPhotos> {

  const { data, error } = await supabase
    .from('albums')
    .select(`
      id,
      title,
      description,
      slug,
      cover_image_url,
      is_public,
      created_at,
      user_id,
      photos:album_photos(
        id,
        photo_url,
        photo:photos!album_photos_photo_id_fkey(deleted_at, blurhash)
      ),
      tags:album_tags(tag)
    `)
    .eq('user_id', userId)
    .eq('slug', slug)
    .is('deleted_at', null)
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to fetch album');
  }

  type AlbumPhotoRow = Pick<Tables<'album_photos'>, 'id' | 'photo_url'>;
  type PhotoRow = Pick<Tables<'photos'>, 'deleted_at' | 'blurhash'>;
  type AlbumPhotoWithPhoto = AlbumPhotoRow & {
    photo: PhotoRow | null;
  };

  type AlbumRow = Pick<Tables<'albums'>, 'id' | 'title' | 'description' | 'slug' | 'cover_image_url' | 'is_public' | 'created_at' | 'user_id'>;
  type AlbumQueryResult = AlbumRow & {
    photos: AlbumPhotoWithPhoto[] | null;
    tags: Array<{ tag: string }> | null;
  };

  // Filter out deleted photos from album and resolve cover image blurhash
  const typedData = data as AlbumQueryResult;
  const activePhotos = (typedData.photos || []).filter((ap) => !ap.photo?.deleted_at);

  const coverUrl = typedData.cover_image_url || activePhotos[0]?.photo_url;
  const coverPhoto = coverUrl
    ? activePhotos.find((ap) => ap.photo_url === coverUrl)
    : activePhotos[0];
  const cover_image_blurhash = coverPhoto?.photo?.blurhash || null;

  const albumWithFilteredPhotos = {
    ...typedData,
    photos: activePhotos,
    cover_image_blurhash,
  };

  return albumWithFilteredPhotos as unknown as AlbumWithPhotos;
}

export function useAlbumBySlug(userId: string | undefined, slug: string | undefined) {
  return useQuery({
    queryKey: ['album', userId, slug],
    queryFn: () => fetchAlbumBySlug(userId!, slug!),
    enabled: !!userId && !!slug,
  });
}
