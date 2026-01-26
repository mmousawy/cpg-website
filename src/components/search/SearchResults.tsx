'use client';

import type { SearchResult } from '@/types/search';
import LoadingSpinner from '../shared/LoadingSpinner';
import SearchResultItem from './SearchResultItem';

interface SearchResultsProps {
  results: SearchResult[];
  isLoading?: boolean;
  isEmpty?: boolean;
  query?: string;
  onResultSelect?: () => void;
  selectedIndex?: number;
}

const groupResultsByType = (results: SearchResult[]): Record<string, SearchResult[]> => {
  const grouped: Record<string, SearchResult[]> = {};
  for (const result of results) {
    if (!grouped[result.entity_type]) {
      grouped[result.entity_type] = [];
    }
    grouped[result.entity_type].push(result);
  }
  return grouped;
};

const typeOrder: SearchResult['entity_type'][] = ['members', 'albums', 'photos', 'events', 'tags'];
const typeLabels: Record<SearchResult['entity_type'], string> = {
  members: 'Members',
  albums: 'Albums',
  photos: 'Photos',
  events: 'Events',
  tags: 'Tags',
};

export default function SearchResults({
  results,
  isLoading,
  isEmpty,
  query,
  onResultSelect,
  selectedIndex = -1,
}: SearchResultsProps) {
  // Build a map from result to its flat index
  const resultIndexMap = new Map<string, number>();
  results.forEach((result, index) => {
    resultIndexMap.set(`${result.entity_type}-${result.entity_id}`, index);
  });

  // Show loading skeleton while fetching
  if (isLoading) {
    return (
      <div
        className="flex items-center gap-3 rounded-lg border border-border-color p-3 min-h-22"
      >
        <div
          className="flex items-center justify-center size-16 shrink-0 animate-pulse rounded bg-background-medium"
        >
          <LoadingSpinner
            size="md"
          />
        </div>
        <div
          className="flex-1 space-y-2"
        >
          <div
            className="h-4 w-3/4 animate-pulse rounded bg-background-medium"
          />
          <div
            className="h-3 w-1/2 animate-pulse rounded bg-background-medium"
          />
        </div>
      </div>
    );
  }

  // Show "no results" when search completed with no results
  if (isEmpty) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-22 text-center"
      >
        <p
          className="text-foreground/60"
        >
          No results found for &quot;
          {query}
          &quot;
        </p>
        <p
          className="mt-2 text-sm text-foreground/40"
        >
          Try a different search term
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return null;
  }

  const grouped = groupResultsByType(results);

  return (
    <div
      className="space-y-6"
    >
      {typeOrder.map((type) => {
        const typeResults = grouped[type];
        if (!typeResults || typeResults.length === 0) {
          return null;
        }

        return (
          <div
            key={type}
            className="space-y-2"
          >
            <h3
              className="text-xs font-semibold uppercase tracking-wide text-foreground/50"
            >
              {typeLabels[type]}
            </h3>
            <div
              className="space-y-2"
            >
              {typeResults.map((result) => {
                const key = `${result.entity_type}-${result.entity_id}`;
                const flatIndex = resultIndexMap.get(key) ?? -1;
                return (
                  <SearchResultItem
                    key={key}
                    result={result}
                    onSelect={onResultSelect}
                    isSelected={flatIndex === selectedIndex}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
