import { cacheTag, cacheLife } from 'next/cache';
import { createPublicClient } from '@/utils/supabase/server';
import type { Tables } from '@/database.types';
import type { Interest } from '@/types/interests';
import { INTEREST_LIST_COLUMNS } from './columns';

type Member = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'nickname' | 'avatar_url'>;

/**
 * Get popular interests ordered by usage count
 * Tagged with 'interests' for cache invalidation
 */
export async function getPopularInterests(limit = 20) {
  'use cache';
  cacheLife('tagged');
  cacheTag('interests');

  const supabase = createPublicClient();

  const { data } = await supabase
    .from('interests')
    .select(INTEREST_LIST_COLUMNS)
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
  const supabase = createPublicClient();
  const { data: interestMeta } = await supabase
    .from('interests')
    .select('id, name, count')
    .eq('name', interest)
    .maybeSingle();

  if (!interestMeta) {
    return { interest: null, members: [] };
  }

  const cached = await getMembersByInterestCached(interest);
  const expectedCount = interestMeta.count ?? 0;
  if (expectedCount > 0 && cached.members.length === 0) {
    return loadMembersByInterestLive(interest, interestMeta as Interest);
  }

  return cached;
}

async function getMembersByInterestCached(interest: string) {
  'use cache';
  cacheLife('tagged');
  cacheTag('interests');
  cacheTag(`interest-${interest}`);

  const supabase = createPublicClient();

  const { data: interestData } = await supabase
    .from('interests')
    .select('id, name, count')
    .eq('name', interest)
    .single();

  const { data: profileInterests } = await supabase
    .from('profile_interests')
    .select('profile_id')
    .eq('interest', interest);

  const linkCount = profileInterests?.length ?? 0;

  if (linkCount === 0) {
    return {
      interest: interestData as Interest,
      members: [],
    };
  }

  const profileIds = profileInterests!.map((pi) => pi.profile_id);

  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, nickname, avatar_url')
    .in('id', profileIds)
    .not('nickname', 'is', null)
    .is('suspended_at', null)
    .is('deletion_scheduled_at', null)
    .order('full_name', { ascending: true, nullsFirst: false })
    .order('nickname', { ascending: true });

  const memberList = (members || []) as Member[];

  return {
    interest: interestData as Interest,
    members: memberList,
  };
}

async function loadMembersByInterestLive(interest: string, interestData: Interest) {
  const supabase = createPublicClient();

  const { data: profileInterests } = await supabase
    .from('profile_interests')
    .select('profile_id')
    .eq('interest', interest);

  const linkCount = profileInterests?.length ?? 0;
  if (linkCount === 0) {
    return { interest: interestData, members: [] };
  }

  const profileIds = profileInterests!.map((pi) => pi.profile_id);

  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, nickname, avatar_url')
    .in('id', profileIds)
    .not('nickname', 'is', null)
    .is('suspended_at', null)
    .is('deletion_scheduled_at', null)
    .order('full_name', { ascending: true, nullsFirst: false })
    .order('nickname', { ascending: true });

  return {
    interest: interestData,
    members: (members || []) as Member[],
  };
}
