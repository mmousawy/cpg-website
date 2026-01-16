import { cacheTag, cacheLife } from 'next/cache';
import { createPublicClient } from '@/utils/supabase/server';
import type { Tables } from '@/database.types';
import type { Interest } from '@/types/interests';

type Member = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'nickname' | 'avatar_url'>;

/**
 * Get popular interests ordered by usage count
 * Tagged with 'interests' for cache invalidation
 */
export async function getPopularInterests(limit = 20) {
  'use cache';
  cacheLife('max');
  cacheTag('interests');

  const supabase = createPublicClient();

  const { data } = await supabase
    .from('interests')
    .select('*')
    .order('count', { ascending: false })
    .order('name', { ascending: true })
    .limit(limit);

  return (data || []) as Interest[];
}

/**
 * Get members with a specific interest
 * Tagged with specific interest tag for granular invalidation
 */
export async function getMembersByInterest(interest: string) {
  'use cache';
  cacheLife('max');
  cacheTag('interests');
  cacheTag(`interest-${interest}`);

  const supabase = createPublicClient();

  // First verify the interest exists
  const { data: interestData } = await supabase
    .from('interests')
    .select('id, name, count')
    .eq('name', interest)
    .single();

  if (!interestData) {
    return {
      interest: null,
      members: [],
    };
  }

  // Get profile IDs with this interest
  const { data: profileInterests } = await supabase
    .from('profile_interests')
    .select('profile_id')
    .eq('interest', interest);

  if (!profileInterests || profileInterests.length === 0) {
    return {
      interest: interestData as Interest,
      members: [],
    };
  }

  const profileIds = profileInterests.map((pi) => pi.profile_id);

  // Get member profiles
  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, nickname, avatar_url')
    .in('id', profileIds)
    .not('nickname', 'is', null)
    .is('suspended_at', null)
    .order('full_name', { ascending: true, nullsFirst: false })
    .order('nickname', { ascending: true });

  return {
    interest: interestData as Interest,
    members: (members || []) as Member[],
  };
}

