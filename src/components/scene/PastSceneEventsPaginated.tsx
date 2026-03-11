'use client';

import type { SceneEventInterested } from '@/lib/data/scene';
import type { SceneEvent } from '@/types/scene';
import { useCallback, useState, useTransition } from 'react';

import Button from '@/components/shared/Button';
import SceneEventCard from './SceneEventCard';

type PastSceneEventsPaginatedProps = {
  initialEvents: SceneEvent[];
  initialInterestedByEvent?: Record<string, SceneEventInterested[]>;
  totalCount: number;
  perPage: number;
};

export default function PastSceneEventsPaginated({
  initialEvents,
  initialInterestedByEvent = {},
  totalCount,
  perPage,
}: PastSceneEventsPaginatedProps) {
  const [events, setEvents] = useState<SceneEvent[]>(initialEvents);
  const [interestedByEvent, setInterestedByEvent] = useState<
    Record<string, SceneEventInterested[]>
  >(initialInterestedByEvent);
  const [isPending, startTransition] = useTransition();

  const hasMore = events.length < totalCount;
  const remainingCount = totalCount - events.length;

  const loadMore = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/scene/past?offset=${events.length}&limit=${perPage}`,
        );

        if (!res.ok) {
          throw new Error('Failed to fetch more events');
        }

        const data = await res.json();
        setEvents((prev) => [...prev, ...data.events]);
        setInterestedByEvent((prev) => ({
          ...prev,
          ...data.interestedByEvent,
        }));
      } catch (error) {
        console.error('Error loading more scene events:', error);
      }
    });
  }, [events.length, perPage]);

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
          className="flex justify-center pt-4"
        >
          <Button
            onClick={loadMore}
            variant="secondary"
            size="md"
            loading={isPending}
            className="bg-foreground/5 dark:bg-border-color/70"
          >
            {isPending
              ? 'Loading...'
              : `Load more (${remainingCount} remaining)`}
          </Button>
        </div>
      )}
    </>
  );
}
