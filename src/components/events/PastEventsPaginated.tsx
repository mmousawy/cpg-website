'use client';

import { useState, useTransition } from 'react';
import EventsList from './EventsList';
import type { CPGEvent, EventAttendee } from '@/types/events';
import Button from '../shared/Button';

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
    return <EventsList events={[]} attendeesByEvent={{}} emptyMessage="No past events yet" />;
  }

  return (
    <>
      <EventsList events={events} attendeesByEvent={attendeesByEvent} />

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={loadMore}
            variant="custom"
            disabled={isPending}
            className="rounded-full bg-foreground/10 border-foreground/10 px-6 py-2.5 text-sm font-medium transition-colors hover:bg-foreground/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading...
              </span>
            ) : (
              `Load more (${remainingCount} remaining)`
            )}
          </Button>
        </div>
      )}
    </>
  );
}
