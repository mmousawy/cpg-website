import { gearAliasKey } from '@/lib/gear/gearAliasKey';
import type { GearCategory, UserGearItem } from '@/lib/gear/types';

export function gearItemIdentityKey(category: GearCategory, name: string): string {
  return `${category}:${gearAliasKey(name.trim())}`;
}

export function resolveGearLabelCasing(params: {
  text: string;
  category: GearCategory;
  catalogId: string | null;
  catalogLabel?: string | null;
  peerItems?: Array<Pick<UserGearItem, 'name' | 'category' | 'catalogId'>>;
}): { name: string; catalogId: string | null } {
  const trimmed = params.text.trim();
  if (!trimmed) {
    return { name: '', catalogId: params.catalogId };
  }

  if (params.catalogLabel?.trim()) {
    return {
      name: params.catalogLabel.trim(),
      catalogId: params.catalogId,
    };
  }

  const key = gearItemIdentityKey(params.category, trimmed);
  const peer = params.peerItems?.find(
    (item) => gearItemIdentityKey(item.category, item.name) === key,
  );
  if (peer) {
    return {
      name: peer.name,
      catalogId: params.catalogId ?? peer.catalogId,
    };
  }

  return { name: trimmed, catalogId: params.catalogId };
}

/** One row per category+alias; first spelling wins; catalog names override. */
export function normalizeGearItemsList(
  items: UserGearItem[],
  catalogDisplayNameById: Map<string, string>,
): UserGearItem[] {
  const result: UserGearItem[] = [];

  for (const item of items) {
    const catalogLabel = item.catalogId
      ? catalogDisplayNameById.get(item.catalogId)
      : undefined;
    const resolved = resolveGearLabelCasing({
      text: item.name,
      category: item.category,
      catalogId: item.catalogId,
      catalogLabel,
      peerItems: result,
    });

    const key = gearItemIdentityKey(item.category, resolved.name);
    if (result.some((existing) => gearItemIdentityKey(existing.category, existing.name) === key)) {
      continue;
    }

    result.push({
      ...item,
      name: resolved.name,
      catalogId: resolved.catalogId,
    });
  }

  return result;
}

/**
 * Apply canonical casing when adding or editing a single inventory row in the UI.
 */
export function prepareGearItemForInventory(
  item: UserGearItem,
  existingItems: UserGearItem[],
  catalogLabel?: string | null,
): UserGearItem {
  const others = existingItems.filter((row) => row.id !== item.id);
  const resolved = resolveGearLabelCasing({
    text: item.name,
    category: item.category,
    catalogId: item.catalogId,
    catalogLabel,
    peerItems: others,
  });

  const key = gearItemIdentityKey(item.category, resolved.name);
  const duplicate = others.find(
    (row) => gearItemIdentityKey(row.category, row.name) === key,
  );

  if (duplicate) {
    return {
      ...duplicate,
      name: resolved.name,
      catalogId: resolved.catalogId ?? duplicate.catalogId,
      note: item.note.trim() || duplicate.note,
    };
  }

  return {
    ...item,
    name: resolved.name,
    catalogId: resolved.catalogId,
    note: item.note.trim(),
  };
}

/** Insert or merge an inventory row; drops the edited row when merge targets another id. */
export function upsertGearInventoryItem(
  items: UserGearItem[],
  prepared: UserGearItem,
  editingId?: string,
): UserGearItem[] {
  const keepId = prepared.id;
  const key = gearItemIdentityKey(prepared.category, prepared.name);

  const next = items.filter((row) => {
    if (editingId && row.id === editingId && keepId !== editingId) {
      return false;
    }
    if (row.id !== keepId && gearItemIdentityKey(row.category, row.name) === key) {
      return false;
    }
    return true;
  });

  const existingIndex = next.findIndex((row) => row.id === keepId);
  if (existingIndex >= 0) {
    return next.map((row, index) => (index === existingIndex ? prepared : row));
  }

  return [...next, prepared];
}
