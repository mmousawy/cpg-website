'use client';

import type { FollowListMember, FollowListType } from '@/types/follows';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useDebounce } from './useDebounce';

const PAGE_SIZE = 20;

type UseFollowListOptions = {
  profileId: string;
  type: FollowListType;
  enabled: boolean;
};

async function fetchFollowListPage({
  profileId,
  type,
  offset,
  query,
  signal,
}: {
  profileId: string;
  type: FollowListType;
  offset: number;
  query: string;
  signal?: AbortSignal;
}) {
  const params = new URLSearchParams({
    profileId,
    type,
    offset: String(offset),
    limit: String(PAGE_SIZE),
  });

  if (query.trim().length >= 2) {
    params.set('q', query.trim());
  }

  const response = await fetch(`/api/follows/list?${params.toString()}`, { signal });

  if (!response.ok) {
    throw new Error('Failed to load follow list');
  }

  return response.json() as Promise<{
    members: FollowListMember[];
    totalCount: number;
    hasMore: boolean;
  }>;
}

export function useFollowList({ profileId, type, enabled }: UseFollowListOptions) {
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState<FollowListMember[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const offsetRef = useRef(0);
  const debouncedQuery = useDebounce(query, 300);
  const fetchIdRef = useRef(0);

  const resetAndFetch = useCallback(async (searchQuery: string) => {
    if (!enabled) return;

    const fetchId = ++fetchIdRef.current;
    setIsLoading(true);
    setError(null);
    offsetRef.current = 0;

    try {
      const data = await fetchFollowListPage({
        profileId,
        type,
        offset: 0,
        query: searchQuery,
      });

      if (fetchId !== fetchIdRef.current) return;

      setMembers(data.members);
      setTotalCount(data.totalCount);
      setHasMore(data.hasMore);
      offsetRef.current = data.members.length;
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load follow list');
      setMembers([]);
      setTotalCount(0);
      setHasMore(false);
      offsetRef.current = 0;
    } finally {
      if (fetchId === fetchIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled, profileId, type]);

  const loadMore = useCallback(() => {
    if (!enabled || !hasMore || isLoading || isPending) return;

    startTransition(async () => {
      const fetchId = fetchIdRef.current;

      try {
        const data = await fetchFollowListPage({
          profileId,
          type,
          offset: offsetRef.current,
          query: debouncedQuery,
        });

        if (fetchId !== fetchIdRef.current) return;

        setMembers((prev) => {
          const seen = new Set(prev.map((member) => member.id));
          const uniqueNew = data.members.filter((member) => !seen.has(member.id));
          if (uniqueNew.length === 0) {
            setHasMore(false);
            return prev;
          }
          return [...prev, ...uniqueNew];
        });
        setTotalCount(data.totalCount);
        setHasMore(data.hasMore);
        offsetRef.current += data.members.length;
      } catch (err) {
        if (fetchId !== fetchIdRef.current) return;
        setError(err instanceof Error ? err.message : 'Failed to load more');
      }
    });
  }, [debouncedQuery, enabled, hasMore, isLoading, isPending, profileId, type]);

  useEffect(() => {
    if (!enabled) {
      setQuery('');
      setMembers([]);
      setTotalCount(0);
      setHasMore(false);
      setError(null);
      offsetRef.current = 0;
      return;
    }

    resetAndFetch(debouncedQuery);
  }, [debouncedQuery, enabled, resetAndFetch]);

  const reset = useCallback(() => {
    setQuery('');
    setMembers([]);
    setTotalCount(0);
    setHasMore(false);
    setError(null);
    offsetRef.current = 0;
  }, []);

  return {
    query,
    setQuery,
    members,
    totalCount,
    hasMore,
    isLoading,
    isLoadingMore: isPending,
    error,
    loadMore,
    reset,
  };
}
