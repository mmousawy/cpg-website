import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

type PhotoCounts = {
  photoCount: number;
  albumCount: number;
};

async function fetchPhotoCounts(userId: string): Promise<PhotoCounts> {
  const supabase = createClient();

  const [photosResult, albumsResult] = await Promise.all([
    supabase
      .from('photos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .not('storage_path', 'like', 'events/%'),
    supabase
      .from('albums')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null),
  ]);

  return {
    photoCount: photosResult.count ?? 0,
    albumCount: albumsResult.count ?? 0,
  };
}

export function usePhotoCounts(userId: string | undefined) {
  return useQuery({
    queryKey: ['counts', userId],
    queryFn: () => fetchPhotoCounts(userId!),
    enabled: !!userId,
  });
}
