import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/database.types';
import { gearProfileFromRows } from '@/lib/gear/mapGearProfile';
import { type UserGearProfile } from '@/lib/gear/types';
import { isPublicProfileAllowed } from '@/lib/auth/isTestProfile';
import { createPublicClient } from '@/utils/supabase/server';
import { cacheLife, cacheTag } from 'next/cache';

type DbClient = SupabaseClient<Database>;

export async function fetchUserGearProfileForUser(
  supabase: DbClient,
  userId: string,
): Promise<UserGearProfile> {
  const [{ data: profileRow }, { data: itemRows }] = await Promise.all([
    supabase
      .from('user_gear_profiles')
      .select(
        'user_id, formats, formats_other, daily_driver_body, daily_driver_body_catalog_id, daily_driver_lens, daily_driver_lens_catalog_id, updated_at',
      )
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('user_gear_items')
      .select('id, user_id, catalog_id, name, category, note, sort_index, added_at')
      .eq('user_id', userId)
      .order('sort_index', { ascending: true }),
  ]);

  return gearProfileFromRows(profileRow, itemRows);
}

async function loadUserGearByNickname(
  nickname: string,
  includeTestContent: boolean,
): Promise<UserGearProfile | null> {
  if (!isPublicProfileAllowed(nickname, includeTestContent)) {
    return null;
  }

  const supabase = createPublicClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('nickname', nickname)
    .is('suspended_at', null)
    .is('deletion_scheduled_at', null)
    .maybeSingle();

  if (!profile) {
    return null;
  }

  return fetchUserGearProfileForUser(supabase, profile.id);
}

async function getUserGearByNicknameCached(
  nickname: string,
  includeTestContent: boolean,
): Promise<UserGearProfile | null> {
  'use cache';
  cacheLife('tagged');
  cacheTag(`profile-${nickname}`);
  cacheTag('user-gear');
  return loadUserGearByNickname(nickname, includeTestContent);
}

/**
 * Public gear profile by member nickname (RLS: active profiles only).
 * In development, always reads Supabase (no cache) so local dev stays in sync
 * when data changes on production or another session.
 */
export async function getUserGearByNickname(
  nickname: string,
  includeTestContent = false,
): Promise<UserGearProfile | null> {
  if (process.env.NODE_ENV === 'development') {
    return loadUserGearByNickname(nickname, includeTestContent);
  }
  return getUserGearByNicknameCached(nickname, includeTestContent);
}

export { isGearProfileEmpty } from '@/lib/gear/types';
