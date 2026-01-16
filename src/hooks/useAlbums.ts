import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase/client';
import type { AlbumWithPhotos } from '@/types/albums';

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
        photo:photos!album_photos_photo_id_fkey(deleted_at)
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

  // Filter out deleted photos from albums
  const albumsWithFilteredPhotos = ((data || []) as any[]).map((album) => ({
    ...album,
    photos: (album.photos || []).filter((ap: any) => !ap.photo?.deleted_at),
  }));

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
        photo:photos!album_photos_photo_id_fkey(deleted_at)
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

  // Filter out deleted photos from album
  const albumWithFilteredPhotos = {
    ...data,
    photos: ((data as any).photos || []).filter((ap: any) => !ap.photo?.deleted_at),
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
