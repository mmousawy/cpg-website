'use client';

import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { SceneEventInterested } from '@/lib/data/scene';
import type { SceneEvent } from '@/types/scene';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';

import SceneEventCard from './SceneEventCard';

type PastSceneEventsPaginatedProps = {
  initialEvents: SceneEvent[];
  initialInterestedByEvent?: Record<string, SceneEventInterested[]>;
  totalCount: number;
  perPage: number;
  /** Active category filter */
  category?: string | null;
};

export default function PastSceneEventsPaginated({
  initialEvents,
  initialInterestedByEvent = {},
  totalCount,
  perPage,
  category = null,
}: PastSceneEventsPaginatedProps) {
  const filteredInitial = useMemo(
    () =>
      category && category !== 'all'
        ? initialEvents.filter((e) => e.category === category)
        : initialEvents,
    [initialEvents, category],
  );

  const [allEvents, setAllEvents] = useState<SceneEvent[]>(filteredInitial);
  const [interestedByEvent, setInterestedByEvent] = useState<
    Record<string, SceneEventInterested[]>
  >(initialInterestedByEvent);
  const [isPending, startTransition] = useTransition();
  const [exhausted, setExhausted] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const bootstrappedCategoryFetchRef = useRef(false);

  useEffect(() => {
    setAllEvents(filteredInitial);
    setExhausted(false);
    bootstrappedCategoryFetchRef.current = false;
  }, [category, filteredInitial]);

  const cpgInAllEvents = allEvents.filter((e) => e.id.startsWith('cpg-')).length;
  const dbEventsLoaded = allEvents.length - cpgInAllEvents;
  const hasMore =
    !exhausted &&
    (!category || category === 'all'
      ? dbEventsLoaded < totalCount
      : true);
  const isBootstrappingCategory =
    !!category && category !== 'all' && allEvents.length === 0 && !exhausted;

  const loadMore = useCallback(() => {
    startTransition(async () => {
      try {
        const params = new URLSearchParams({
          offset: String(dbEventsLoaded),
          limit: String(perPage),
        });
        if (category && category !== 'all') {
          params.set('category', category);
        }
        const res = await fetch(`/api/scene/past?${params}`);

        if (!res.ok) {
          throw new Error('Failed to fetch more events');
        }

        const data = await res.json();
        const newEvents = data.events as SceneEvent[];
        if (newEvents.length === 0) {
          setExhausted(true);
          return;
        }
        setAllEvents((prev) => {
          const seenIds = new Set(prev.map((event) => event.id));
          const uniqueNewEvents = newEvents.filter((event) => !seenIds.has(event.id));

          if (uniqueNewEvents.length === 0) {
            setExhausted(true);
            return prev;
          }

          return [...prev, ...uniqueNewEvents];
        });
        setInterestedByEvent((prev) => ({
          ...prev,
          ...data.interestedByEvent,
        }));
      } catch (error) {
        console.error('Error loading more scene events:', error);
      }
    });
  }, [dbEventsLoaded, perPage, category]);

  useEffect(() => {
    if (!category || category === 'all') return;
    if (filteredInitial.length > 0 || allEvents.length > 0) return;
    if (isPending || exhausted || bootstrappedCategoryFetchRef.current) return;

    bootstrappedCategoryFetchRef.current = true;
    loadMore();
  }, [allEvents.length, category, exhausted, filteredInitial.length, isPending, loadMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isPending) {
          loadMore();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isPending, loadMore]);

  return (
    <>
      <div
        className="grid gap-4 sm:gap-6"
      >
        {allEvents.map((event) => (
          <SceneEventCard
            key={event.id}
            event={event}
            interested={interestedByEvent[event.id] ?? []}
          />
        ))}
      </div>
      {allEvents.length === 0 && !isBootstrappingCategory && (
        <div
          className="text-center py-8 rounded-xl border border-dashed border-border-color"
        >
          <p
            className="text-foreground/80"
          >
            No past events yet
          </p>
        </div>
      )}
      {isBootstrappingCategory && (
        <div
          className="flex flex-col items-center justify-center py-8 text-foreground/70"
        >
          <LoadingSpinner
            size="sm"
            className="mb-3"
          />
          <p
            className="text-sm"
          >
            Loading past events...
          </p>
        </div>
      )}
      {hasMore && allEvents.length > 0 && (
        <div
          ref={sentinelRef}
          className="flex justify-center pt-4 pb-2"
        >
          {isPending && (
            <p
              className="text-sm text-foreground/50 animate-pulse"
            >
              Loading more...
            </p>
          )}
        </div>
      )}
    </>
  );
}
