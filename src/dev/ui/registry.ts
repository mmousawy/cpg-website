import { uiComponentGroups, type UiCatalogEntry, type UiComponentGroup } from './componentCatalog';
import type { UiGroupSummary } from './types';

export function getUiComponentGroups(): UiComponentGroup[] {
  return uiComponentGroups;
}

export function getUiGroupById(id: string): UiComponentGroup | undefined {
  return uiComponentGroups.find((g) => g.id === id);
}

export function getCatalogEntry(groupId: string, componentName: string): UiCatalogEntry | undefined {
  const group = getUiGroupById(groupId);
  return group?.entries.find((e) => e.name === componentName);
}

export function listCatalogEntries(): Array<UiCatalogEntry & { groupId: string; groupLabel: string }> {
  return uiComponentGroups.flatMap((group) =>
    group.entries.map((entry) => ({
      ...entry,
      groupId: group.id,
      groupLabel: group.label,
    })),
  );
}

export function summarizeUiGroups(): UiGroupSummary[] {
  return uiComponentGroups.map((group) => {
    const live = group.entries.filter((e) => !e.catalogOnly).length;
    const catalog = group.entries.length - live;
    return {
      id: group.id,
      label: group.label,
      total: group.entries.length,
      live,
      catalog,
    };
  });
}

export const storyboardGroupOrder = summarizeUiGroups().sort((a, b) => a.label.localeCompare(b.label));
