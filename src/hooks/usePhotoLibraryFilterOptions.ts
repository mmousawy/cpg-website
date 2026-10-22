import {
  buildPhotoLibraryFilterOptions,
  type PhotoLibraryFilterOptions,
} from '@/hooks/photoLibraryFilters';
import { supabase } from '@/utils/supabase/client';
import { useQuery } from '@tanstack/react-query';

const FILTER_OPTIONS_SELECT = `
  title,
  exif_data,
  photo_tags(tag),
  album_photos!album_photos_photo_id_fkey(
    album:albums(id, title, deleted_at)
  ),
  challenge_submissions!challenge_submissions_photo_id_fkey(
    status,
    challenge:challenges(id, title)
  )
`;

async function fetchPhotoLibraryFilterOptions(userId: string): Promise<PhotoLibraryFilterOptions> {
  const { data, error } = await supabase
    .from('photos')
    .select(FILTER_OPTIONS_SELECT)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .not('storage_path', 'like', 'events/%');

  if (error) {
    throw new Error(error.message || 'Failed to load filter options');
  }

  return buildPhotoLibraryFilterOptions((data ?? []) as Parameters<typeof buildPhotoLibraryFilterOptions>[0]);
}

export function photoLibraryFilterOptionsQueryKey(userId: string) {
  return ['photo-library-filter-options', userId] as const;
}

export function usePhotoLibraryFilterOptions(userId: string | undefined) {
  return useQuery({
    queryKey: photoLibraryFilterOptionsQueryKey(userId!),
    queryFn: () => fetchPhotoLibraryFilterOptions(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  });
}
