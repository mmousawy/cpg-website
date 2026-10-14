'use client';

import { useEffect, useState } from 'react';

import type { GearSearchResult } from '@/lib/gear/searchCatalog';
import type { GearCategory } from '@/lib/gear/types';

export function useGearCatalogSearch(query: string, category?: GearCategory | null) {
  const [results, setResults] = useState<GearSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: trimmed });
        if (category) params.set('category', category);
        const res = await fetch(`/api/gear/search?${params.toString()}`);
        if (!res.ok) {
          setResults([]);
          return;
        }
        const json = (await res.json()) as { results: GearSearchResult[] };
        setResults(json.results ?? []);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, category]);

  return { results, loading };
}
