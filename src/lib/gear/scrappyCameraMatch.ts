import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/database.types';
import { gearAliasKey } from '@/lib/gear/gearAliasKey';
import {
  matchScrappyCameraIcon,
  SCRAPPY_CAMERA_ICON_GENERIC,
} from '@/lib/gear/scrappyCameraIcon';
import type { UserGearProfile } from '@/lib/gear/types';

type AdminClient = SupabaseClient<Database>;

function resolveScrappyFileName(camera: string): string {
  return matchScrappyCameraIcon(camera) ?? SCRAPPY_CAMERA_ICON_GENERIC;
}

/**
 * Record a scrappy icon match for a camera display name if not already checked.
 * Returns the stored file name, or null when the input is empty.
 */
export async function ensureScrappyCameraMatch(
  supabase: AdminClient,
  camera: string,
): Promise<string | null> {
  const displayName = camera.trim();
  if (!displayName) return null;

  const aliasKey = gearAliasKey(displayName);
  if (!aliasKey) return null;

  const { data: existing } = await supabase
    .from('scrappy_camera_matches')
    .select('file_name')
    .eq('alias_key', aliasKey)
    .maybeSingle();

  if (existing?.file_name) {
    return existing.file_name;
  }

  const fileName = resolveScrappyFileName(displayName);

  const { error } = await supabase.from('scrappy_camera_matches').upsert(
    {
      alias_key: aliasKey,
      display_name: displayName,
      file_name: fileName,
    },
    { onConflict: 'alias_key', ignoreDuplicates: true },
  );

  if (error) {
    console.error('scrappy_camera_matches upsert failed', error);
  }

  return fileName;
}

export async function ensureScrappyCameraMatchesForProfile(
  supabase: AdminClient,
  profile: UserGearProfile,
): Promise<void> {
  const names = new Set<string>();

  const dailyDriver = profile.dailyDriverBody.trim();
  if (dailyDriver) names.add(dailyDriver);

  for (const item of profile.items) {
    if (item.category === 'camera_body' || item.category === 'phone') {
      const name = item.name.trim();
      if (name) names.add(name);
    }
  }

  for (const name of names) {
    await ensureScrappyCameraMatch(supabase, name);
  }
}
