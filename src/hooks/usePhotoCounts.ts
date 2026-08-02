import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase/client';

async function fetchPhotoCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('photos')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('deleted_at', null)
    .not('storage_path', 'like', 'events/%');

  if (error) {
    throw new Error(error.message || 'Failed to fetch photo count');
  }

  return count ?? 0;
}

async function fetchAlbumCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('albums')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (error) {
    throw new Error(error.message || 'Failed to fetch album count');
  }

  return count ?? 0;
}

export function photoCountQueryKey(userId: string) {
  return ['counts', 'photos', userId] as const;
}

export function albumCountQueryKey(userId: string) {
  return ['counts', 'albums', userId] as const;
}

export function usePhotoCount(userId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: photoCountQueryKey(userId!),
    queryFn: () => fetchPhotoCount(userId!),
    enabled: !!userId && (options?.enabled ?? true),
  });
}

export function useAlbumCount(userId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: albumCountQueryKey(userId!),
    queryFn: () => fetchAlbumCount(userId!),
    enabled: !!userId && (options?.enabled ?? true),
  });
}
