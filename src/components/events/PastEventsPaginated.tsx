'use client';

import type { CPGEvent, EventAttendee } from '@/types/events';
import { useEffect, useState, useTransition } from 'react';
import Button from '../shared/Button';
import EventsList from './EventsList';

type PastEventsPaginatedProps = {
  initialEvents: CPGEvent[];
  initialAttendees: Record<number, EventAttendee[]>;
  totalCount: number;
  perPage: number;
};

export default function PastEventsPaginated({
  initialEvents,
  initialAttendees,
  totalCount,
  perPage,
}: PastEventsPaginatedProps) {
  const [events, setEvents] = useState<CPGEvent[]>(initialEvents);
  const [attendeesByEvent, setAttendeesByEvent] = useState<Record<number, EventAttendee[]>>(initialAttendees);
  const [isPending, startTransition] = useTransition();

  // Start with a fixed timestamp for SSR (Jan 1, 2026), update on client
  const [clientNow, setClientNow] = useState(1767225600000);

  useEffect(() => {
    setClientNow(Date.now());
  }, []);

  const hasMore = events.length < totalCount;
  const remainingCount = totalCount - events.length;

  const loadMore = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/events/past?offset=${events.length}&limit=${perPage}`);

        if (!res.ok) {
          throw new Error('Failed to fetch more events');
        }

        const data = await res.json();

        setEvents(prev => [...prev, ...data.events]);
        setAttendeesByEvent(prev => ({ ...prev, ...data.attendeesByEvent }));
      } catch (error) {
        console.error('Error loading more events:', error);
      }
    });
  };

  if (events.length === 0) {
    return <EventsList
      events={[]}
      attendeesByEvent={{}}
      emptyMessage="No past events yet"
      serverNow={clientNow}
    />;
  }

  return (
    <>
      <EventsList
        events={events}
        attendeesByEvent={attendeesByEvent}
        serverNow={clientNow}
      />

      {hasMore && (
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
            {isPending ? 'Loading...' : `Load more (${remainingCount} remaining)`}
          </Button>
        </div>
      )}
    </>
  );
}
