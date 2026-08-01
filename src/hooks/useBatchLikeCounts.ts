'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase/client';

async function fetchBatchPhotoLikeCounts(shortIds: string[]): Promise<Map<string, number>> {
  if (shortIds.length === 0) {
    return new Map();
  }

  const { data: photos, error } = await supabase
    .from('photos')
    .select('short_id, likes_count')
    .in('short_id', shortIds);

  if (error) {
    throw error;
  }

  const result = new Map<string, number>();
  for (const photo of photos || []) {
    result.set(photo.short_id, photo.likes_count ?? 0);
  }

  for (const shortId of shortIds) {
    if (!result.has(shortId)) {
      result.set(shortId, 0);
    }
  }

  return result;
}

async function fetchBatchAlbumLikeCounts(slugs: string[]): Promise<Map<string, number>> {
  if (slugs.length === 0) {
    return new Map();
  }

  const { data: albums, error } = await supabase
    .from('albums')
    .select('slug, likes_count')
    .in('slug', slugs);

  if (error) {
    throw error;
  }

  const result = new Map<string, number>();
  for (const album of albums || []) {
    result.set(album.slug, album.likes_count ?? 0);
  }

  for (const slug of slugs) {
    if (!result.has(slug)) {
      result.set(slug, 0);
    }
  }

  return result;
}

export function useBatchPhotoLikeCounts(shortIds: string[]) {
  return useQuery({
    queryKey: ['batch-photo-like-counts', shortIds.sort().join(',')],
    queryFn: () => fetchBatchPhotoLikeCounts(shortIds),
    enabled: shortIds.length > 0,
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

export function useBatchAlbumLikeCounts(slugs: string[]) {
  return useQuery({
    queryKey: ['batch-album-like-counts', slugs.sort().join(',')],
    queryFn: () => fetchBatchAlbumLikeCounts(slugs),
    enabled: slugs.length > 0,
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}
