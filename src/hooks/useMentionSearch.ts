import type { MentionProfile } from '@/lib/mentions/types';
import { useEffect, useState } from 'react';

export function useMentionSearch(query: string | null) {
  const [results, setResults] = useState<MentionProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const handle = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/members/mention-search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Search failed');
          setResults(data.results ?? []);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          setResults([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 150);

    return () => {
      window.clearTimeout(handle);
      controller.abort();
    };
  }, [query]);

  return { results, loading };
}
