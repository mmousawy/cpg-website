import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/database.types';
import type { Interest } from '@/types/interests';

type Client = SupabaseClient<Database>;

/**
 * Replaces `interests.count` with the number of public members.
 * Public means a nickname is set, and the profile is not suspended or scheduled for deletion.
 * Suspended and pending-deletion profiles are already hidden by row level security.
 */
export async function withPublicInterestCounts(
  supabase: Client,
  interests: Interest[],
): Promise<Interest[]> {
  if (interests.length === 0) return interests;

  const names = interests.map((interest) => interest.name);
  const counts = new Map<string, number>();
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('profile_interests')
      .select('interest, profiles!inner(nickname)')
      .in('interest', names)
      .not('profiles.nickname', 'is', null)
      .range(from, from + pageSize - 1);

    if (error || !data) return interests;

    for (const row of data) {
      counts.set(row.interest, (counts.get(row.interest) ?? 0) + 1);
    }

    if (data.length < pageSize) break;
  }

  return interests.map((interest) => ({
    ...interest,
    count: counts.get(interest.name) ?? 0,
  }));
}
