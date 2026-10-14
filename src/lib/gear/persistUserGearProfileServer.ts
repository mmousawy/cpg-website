import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Json } from '@/database.types';
import type { UserGearProfile } from '@/lib/gear/types';

export function buildSaveUserGearProfileRpcArgs(
  profile: UserGearProfile,
): Database['public']['Functions']['save_user_gear_profile']['Args'] {
  return {
    p_formats: profile.formats,
    p_formats_other: profile.formatsOther,
    p_daily_driver_body: profile.dailyDriverBody,
    p_daily_driver_body_catalog_id: profile.dailyDriverBodyCatalogId,
    p_daily_driver_lens: profile.dailyDriverLens,
    p_daily_driver_lens_catalog_id: profile.dailyDriverLensCatalogId,
    p_items: profile.items as unknown as Json,
  };
}

export async function persistUserGearProfileServer(
  supabase: SupabaseClient<Database>,
  profile: UserGearProfile,
) {
  return supabase.rpc(
    'save_user_gear_profile',
    buildSaveUserGearProfileRpcArgs(profile),
  );
}
