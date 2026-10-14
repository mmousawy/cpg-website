import {
  GEAR_CATEGORIES,
  GEAR_CATEGORY_GROUP_LABELS,
  type GearCategory,
  type UserGearItem,
} from '@/lib/gear/types';

export type GearSortMode = 'type' | 'name' | 'added' | 'custom';

export function sortGearItems(items: UserGearItem[], mode: GearSortMode): UserGearItem[] {
  if (mode === 'custom') {
    return [...items];
  }
  const copy = [...items];
  if (mode === 'name') {
    copy.sort((a, b) => a.name.localeCompare(b.name));
  } else if (mode === 'added') {
    copy.sort((a, b) => b.addedAt - a.addedAt);
  } else {
    copy.sort((a, b) => {
      const catA = GEAR_CATEGORIES.indexOf(a.category);
      const catB = GEAR_CATEGORIES.indexOf(b.category);
      if (catA !== catB) return catA - catB;
      return a.name.localeCompare(b.name);
    });
  }
  return copy;
}

export function groupGearByCategory(
  items: UserGearItem[],
): Array<{ category: GearCategory; label: string; items: UserGearItem[] }> {
  const groups = new Map<GearCategory, UserGearItem[]>();
  for (const item of items) {
    const list = groups.get(item.category) ?? [];
    list.push(item);
    groups.set(item.category, list);
  }
  return GEAR_CATEGORIES
    .filter((c) => groups.has(c))
    .map((category) => ({
      category,
      label: GEAR_CATEGORY_GROUP_LABELS[category],
      items: groups.get(category) ?? [],
    }));
}
