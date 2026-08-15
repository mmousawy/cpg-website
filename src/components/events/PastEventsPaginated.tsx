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
  serverNow: number;
};

const STORAGE_KEY = 'past-events-paginated-/events';

type CachedState = {
  events: CPGEvent[];
  attendeesByEvent: Record<number, EventAttendee[]>;
  timestamp: number;
};

// Cache expires after 5 minutes
const CACHE_EXPIRY_MS = 5 * 60 * 1000;

export default function PastEventsPaginated({
  initialEvents,
  initialAttendees,
  totalCount,
  perPage,
  serverNow,
}: PastEventsPaginatedProps) {
  const [events, setEvents] = useState<CPGEvent[]>(initialEvents);
  const [attendeesByEvent, setAttendeesByEvent] = useState<Record<number, EventAttendee[]>>(initialAttendees);
  const [isPending, startLoadMore] = useTransition();

  // Restore extra loaded pages from sessionStorage after mount
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY);
      if (!cached) return;

      const parsed: CachedState = JSON.parse(cached);
      if (Date.now() - parsed.timestamp >= CACHE_EXPIRY_MS) return;
      if (parsed.events.length <= initialEvents.length) return;

      setEvents(parsed.events);
      setAttendeesByEvent(parsed.attendeesByEvent);
    } catch {
      // Ignore storage errors
    }
  }, [initialEvents.length]);

  // Persist state to sessionStorage when events change
  useEffect(() => {
    // Only cache if we have more than the initial events
    if (events.length > initialEvents.length) {
      try {
        const state: CachedState = {
          events,
          attendeesByEvent,
          timestamp: Date.now(),
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // Ignore storage errors (quota exceeded, etc.)
      }
    }
  }, [events, attendeesByEvent, initialEvents.length]);

  const hasMore = events.length < totalCount;
  const remainingCount = totalCount - events.length;

  const loadMore = () => {
    startLoadMore(async () => {
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
    return (
      <EventsList
        events={[]}
        attendeesByEvent={{}}
        emptyMessage="No past events yet"
        serverNow={serverNow}
      />
    );
  }

  return (
    <>
      <EventsList
        events={events}
        attendeesByEvent={attendeesByEvent}
        serverNow={serverNow}
      />

      {hasMore && (
        <div
          className="flex justify-center max-sm:mb-4 sm:pt-4"
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
