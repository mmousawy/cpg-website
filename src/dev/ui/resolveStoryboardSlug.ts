import type { UiCatalogEntry } from './componentCatalog';
import {
  findSubcategoryForComponent,
  getStoryboardSubcategory,
  type StoryboardSubcategory,
} from './subcategories';

export type ResolvedStoryboardSlug =
  | { kind: 'subcategory'; subcategory: StoryboardSubcategory }
  | { kind: 'component'; entry: UiCatalogEntry }
  | { kind: 'redirect-to-subcategory'; subcategoryId: string; hash: string };

export function resolveStoryboardSlug(
  groupId: string,
  slug: string,
  getEntry: (groupId: string, name: string) => UiCatalogEntry | undefined,
): ResolvedStoryboardSlug | null {
  const subcategory = getStoryboardSubcategory(groupId, slug);
  if (subcategory) {
    return { kind: 'subcategory', subcategory };
  }

  const entry = getEntry(groupId, slug);
  if (!entry) {
    return null;
  }

  const parent = findSubcategoryForComponent(groupId, slug);
  if (parent) {
    return { kind: 'redirect-to-subcategory', subcategoryId: parent.id, hash: slug };
  }

  return { kind: 'component', entry };
}
