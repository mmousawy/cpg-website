import { helpSearchEntries } from './helpSearchIndex.generated';

export type HelpSearchEntry = {
  itemId: string;
  title: string;
  sectionTitle: string;
  searchText: string;
  url: string;
};

export function getHelpSearchIndex(): HelpSearchEntry[] {
  return helpSearchEntries;
}
