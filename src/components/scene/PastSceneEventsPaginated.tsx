'use client';

import type { SceneEventInterested } from '@/lib/data/scene';
import type { SceneEvent } from '@/types/scene';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import SceneEventCard from './SceneEventCard';

type PastSceneEventsPaginatedProps = {
  initialEvents: SceneEvent[];
  initialInterestedByEvent?: Record<string, SceneEventInterested[]>;
  totalCount: number;
  perPage: number;
  /** CPG past events (prepended); exclude from offset for Load more */
  cpgPastCount?: number;
};

export default function PastSceneEventsPaginated({
  initialEvents,
  initialInterestedByEvent = {},
  totalCount,
  perPage,
  cpgPastCount = 0,
}: PastSceneEventsPaginatedProps) {
  const [events, setEvents] = useState<SceneEvent[]>(initialEvents);
  const [interestedByEvent, setInterestedByEvent] = useState<
    Record<string, SceneEventInterested[]>
  >(initialInterestedByEvent);
  const [isPending, startTransition] = useTransition();

  const sentinelRef = useRef<HTMLDivElement>(null);

  const dbEventsShown = events.length - cpgPastCount;
  const [exhausted, setExhausted] = useState(false);
  const hasMore = !exhausted && dbEventsShown < totalCount;

  const loadMore = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/scene/past?offset=${dbEventsShown}&limit=${perPage}`,
        );

        if (!res.ok) {
          throw new Error('Failed to fetch more events');
        }

        const data = await res.json();
        const newEvents = data.events as SceneEvent[];
        if (newEvents.length === 0) {
          setExhausted(true);
          return;
        }
        setEvents((prev) => [...prev, ...newEvents]);
        setInterestedByEvent((prev) => ({
          ...prev,
          ...data.interestedByEvent,
        }));
      } catch (error) {
        console.error('Error loading more scene events:', error);
      }
    });
  }, [dbEventsShown, perPage]);

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
        {events.map((event) => (
          <SceneEventCard
            key={event.id}
            event={event}
            interested={interestedByEvent[event.id] ?? []}
          />
        ))}
      </div>
      {events.length === 0 && (
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
      {hasMore && events.length > 0 && (
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
