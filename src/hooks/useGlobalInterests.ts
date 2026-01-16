import { supabase } from '@/utils/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { Interest } from '@/types/interests';

/**
 * Fetches all interests from the shared interests table, ordered by usage count.
 * Used for autocomplete suggestions in profile interests.
 */
export function useGlobalInterests() {
  return useQuery({
    queryKey: ['global-interests'],
    queryFn: async (): Promise<Interest[]> => {
      const { data, error } = await supabase
        .from('interests')
        .select('*')
        .order('count', { ascending: false })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching global interests:', error);
        return [];
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Filters interests based on a search query prefix.
 * Returns interests that start with the query, sorted by popularity.
 */
export function filterInterestsByPrefix(interests: Interest[], query: string): Interest[] {
  if (!query.trim()) return interests.slice(0, 10); // Return top 10 by count when no query

  const lowerQuery = query.toLowerCase().trim();
  return interests
    .filter((interest) => interest.name.toLowerCase().startsWith(lowerQuery))
    .slice(0, 10);
}
