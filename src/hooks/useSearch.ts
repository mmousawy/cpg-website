'use client';

import { useEffect, useState } from 'react';
import { useDebounce } from './useDebounce';
import type { SearchResult, SearchEntityType } from '@/types/search';

interface UseSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  types?: SearchEntityType[];
  limit?: number;
}

export function useSearch(options: UseSearchOptions = {}) {
  const {
    debounceMs = 300,
    minQueryLength = 2,
    types,
    limit = 20,
  } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Track the last query we got results for (to detect "waiting for results" state)
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');

  const debouncedQuery = useDebounce(query, debounceMs);

  useEffect(() => {
    // Early exit for short queries
    if (!debouncedQuery || debouncedQuery.trim().length < minQueryLength) {
      setResults([]);
      setLastSearchedQuery('');
      return;
    }

    const controller = new AbortController();

    const performSearch = async () => {
      try {
        const params = new URLSearchParams({
          q: debouncedQuery.trim(),
          limit: limit.toString(),
        });

        if (types && types.length > 0) {
          params.append('types', types.join(','));
        }

        const response = await fetch(`/api/search?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Search failed');
        }

        const data = await response.json();
        setResults(data.results || []);
        setLastSearchedQuery(debouncedQuery);
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        console.error('Search error:', err);
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
        setLastSearchedQuery(debouncedQuery);
      }
    };

    setError(null);
    performSearch();

    // Cleanup: abort pending requests when query changes
    return () => {
      controller.abort();
    };
  }, [debouncedQuery, minQueryLength, types, limit]);

  // Loading if:
  // 1. Query is pending debounce (user is typing)
  // 2. OR: debouncedQuery is valid but we haven't got results for it yet
  const isPendingDebounce = query.trim().length >= minQueryLength && query !== debouncedQuery;
  const isWaitingForResults = debouncedQuery.trim().length >= minQueryLength && debouncedQuery !== lastSearchedQuery;
  const isLoading = isPendingDebounce || isWaitingForResults;

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    hasResults: results.length > 0,
    isEmpty: !isLoading && debouncedQuery.length >= minQueryLength && results.length === 0,
  };
}
