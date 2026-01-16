import { supabase } from '@/utils/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { Tag } from '@/types/photos';

/**
 * Fetches all tags from the shared tags table, ordered by usage count.
 * Used for autocomplete suggestions across albums and photos.
 */
export function useGlobalTags() {
  return useQuery({
    queryKey: ['global-tags'],
    queryFn: async (): Promise<Tag[]> => {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('count', { ascending: false })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching global tags:', error);
        return [];
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Filters tags based on a search query prefix.
 * Returns tags that start with the query, sorted by popularity.
 */
export function filterTagsByPrefix(tags: Tag[], query: string): Tag[] {
  if (!query.trim()) return tags.slice(0, 10); // Return top 10 by count when no query

  const lowerQuery = query.toLowerCase().trim();
  return tags
    .filter((tag) => tag.name.toLowerCase().startsWith(lowerQuery))
    .slice(0, 10);
}

/**
 * Fetches tags for a specific photo by ID.
 */
export function usePhotoTags(photoId: string | undefined) {
  return useQuery({
    queryKey: ['photo-tags', photoId],
    queryFn: async () => {
      if (!photoId) return [];

      const { data, error } = await supabase
        .from('photo_tags')
        .select('tag')
        .eq('photo_id', photoId);

      if (error) {
        console.error('Error fetching photo tags:', error);
        return [];
      }

      return data?.map((t) => t.tag) || [];
    },
    enabled: !!photoId,
  });
}
