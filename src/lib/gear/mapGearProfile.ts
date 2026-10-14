import type { Tables } from '@/database.types';
import {
  EMPTY_GEAR_PROFILE,
  type GearCategory,
  type ShootingFormat,
  type UserGearItem,
  type UserGearProfile,
} from '@/lib/gear/types';

type GearProfileRow = Tables<'user_gear_profiles'>;
type GearItemRow = Tables<'user_gear_items'>;

export function gearProfileFromRows(
  profileRow: GearProfileRow | null,
  itemRows: GearItemRow[] | null,
): UserGearProfile {
  if (!profileRow) {
    return { ...EMPTY_GEAR_PROFILE };
  }

  const items: UserGearItem[] = (itemRows ?? [])
    .slice()
    .sort((a, b) => a.sort_index - b.sort_index)
    .map((row) => ({
      id: row.id,
      catalogId: row.catalog_id,
      name: row.name,
      category: row.category as GearCategory,
      note: row.note,
      addedAt: Date.parse(row.added_at),
    }));

  return {
    formats: (profileRow.formats ?? []) as ShootingFormat[],
    formatsOther: profileRow.formats_other ?? '',
    dailyDriverBody: profileRow.daily_driver_body,
    dailyDriverBodyCatalogId: profileRow.daily_driver_body_catalog_id,
    dailyDriverLens: profileRow.daily_driver_lens,
    dailyDriverLensCatalogId: profileRow.daily_driver_lens_catalog_id,
    items,
  };
}
