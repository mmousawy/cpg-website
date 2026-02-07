'use client';

import type { CPGEvent, EventAttendee } from '@/types/events';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useTransition, useCallback } from 'react';
import Button from '../shared/Button';
import EventsList from './EventsList';

type PastEventsPaginatedProps = {
  initialEvents: CPGEvent[];
  initialAttendees: Record<number, EventAttendee[]>;
  totalCount: number;
  perPage: number;
};

// Session storage key
const STORAGE_KEY_PREFIX = 'past-events-paginated-';

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
}: PastEventsPaginatedProps) {
  const pathname = usePathname();
  const storageKey = `${STORAGE_KEY_PREFIX}${pathname}`;

  // Initialize state from sessionStorage if available
  const getInitialState = useCallback((): { events: CPGEvent[]; attendeesByEvent: Record<number, EventAttendee[]> } => {
    if (typeof window === 'undefined') {
      return { events: initialEvents, attendeesByEvent: initialAttendees };
    }

    try {
      const cached = sessionStorage.getItem(storageKey);
      if (cached) {
        const parsed: CachedState = JSON.parse(cached);
        // Check if cache is still valid
        if (Date.now() - parsed.timestamp < CACHE_EXPIRY_MS && parsed.events.length > 0) {
          return { events: parsed.events, attendeesByEvent: parsed.attendeesByEvent };
        }
      }
    } catch {
      // Ignore storage errors
    }

    return { events: initialEvents, attendeesByEvent: initialAttendees };
  }, [storageKey, initialEvents, initialAttendees]);

  const [events, setEvents] = useState<CPGEvent[]>(() => getInitialState().events);
  const [attendeesByEvent, setAttendeesByEvent] = useState<Record<number, EventAttendee[]>>(() => getInitialState().attendeesByEvent);
  const [isPending, startTransition] = useTransition();

  // Start with a fixed timestamp for SSR (Jan 1, 2026), update on client
  const [clientNow, setClientNow] = useState(1767225600000);

  useEffect(() => {
    setClientNow(Date.now());
  }, []);

  // Restore state from sessionStorage on mount (client-side only)
  useEffect(() => {
    const { events: cachedEvents, attendeesByEvent: cachedAttendees } = getInitialState();
    // Only restore if we have more than initial events
    if (cachedEvents.length > initialEvents.length) {
      setEvents(cachedEvents);
      setAttendeesByEvent(cachedAttendees);
    }
  }, [getInitialState, initialEvents.length]);

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
        sessionStorage.setItem(storageKey, JSON.stringify(state));
      } catch {
        // Ignore storage errors (quota exceeded, etc.)
      }
    }
  }, [events, attendeesByEvent, storageKey, initialEvents.length]);

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
