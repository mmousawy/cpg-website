import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';

import Attendees, { AttendeesLoading } from './Attendees';

import CalendarSVG from 'public/icons/calendar2.svg';
import LocationSVG from 'public/icons/location.svg';
import SadSVG from 'public/icons/sad.svg';
import TimeSVG from 'public/icons/time.svg';
import EventRsvpStatus from './EventRsvpStatus';
import { Suspense } from 'react';
import EventImage from './EventImage';
import Container from '../layout/Container';

import type { CPGEvent } from '@/types/events';

export default async function Events({ filter, emptyMessage }: { filter: 'upcoming' | 'past', emptyMessage?: string }) {
  const supabase = await createClient();

  // Fetch events
  const response = await supabase
    .from("events")
    .select('id, title, description, date, location, time, cover_image, created_at, image_blurhash, image_height, image_url, image_width, max_attendees, rsvp_count, slug')
    .order('date', { ascending: true })
    .limit(20);
  if (response.error || !Array.isArray(response.data)) {
    // You can customize this error handling as needed
    throw new Error(`Failed to fetch events: ${response.error?.message ?? 'Unknown error'}`);
  }

  const events: CPGEvent[] = response.data;


  // Filter events based on the filter prop
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Reset time to start of day for fair comparison

  const filteredEvents = events?.filter((event) => {
    const eventDate = new Date(event.date!);
    eventDate.setHours(0, 0, 0, 0); // Reset time to start of day

    if (filter === 'upcoming') {
      return eventDate >= now;
    } else {
      return eventDate < now;
    }
  });

  // Normalize event data
  const enrichedEvents = (filteredEvents ?? [])
    .filter((event): event is CPGEvent => !!event && typeof event === 'object')
    .map((event) => ({
      ...event,
      created_at: event.created_at ?? null,
      image_blurhash: event.image_blurhash ?? null,
      image_height: event.image_height ?? null,
      image_url: event.image_url ?? null,
      image_width: event.image_width ?? null,
      max_attendees: event.max_attendees ?? null,
      rsvp_count: event.rsvp_count ?? null,
    }));

  return (
    <>
      {(!enrichedEvents || enrichedEvents.length === 0) && (
        <Container className="text-center">
          <p className="text-foreground/80"><SadSVG className="inline align-top h-6 w-6 mr-2 fill-foreground/80" /> {emptyMessage || 'No events found'}</p>
        </Container>
      )}
      {enrichedEvents && enrichedEvents.map((event) => (
        <Container key={event.id}>
          <div>
            <EventImage event={event} size='small' />
            <div className='mb-6 flex justify-between'>
              <Link href={`/events/${event.slug}`} className="group">
                <h3 className="text-2xl font-bold group-hover:text-primary transition-colors">{event.title}</h3>
              </Link>
              <EventRsvpStatus event={event} className="ml-2 max-sm:hidden" />
            </div>
            <div className='flex gap-6'>
              <div>
                <span className='mb-2 flex gap-4 text-[15px] font-semibold leading-6 max-sm:mb-2'>
                  <span className='flex gap-2'><CalendarSVG className="shrink-0 fill-foreground" />
                    {new Date(event.date!).toLocaleString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className='flex gap-2'><TimeSVG className="shrink-0 fill-foreground " />{event.time?.substring(0, 5)}</span>
                </span>
                <span className='mb-6 flex items-start gap-2 whitespace-pre-wrap text-[15px] font-semibold leading-6 max-sm:hidden'>
                  <LocationSVG className="shrink-0 fill-foreground " />{event.location?.replace(/\r\n/gm, ' • ')}
                </span>
                <span className='mb-6 flex items-start gap-2 whitespace-pre-wrap text-[15px] font-semibold max-sm:mb-6 sm:hidden'>
                  <LocationSVG className="shrink-0 fill-foreground " />{event.location}
                </span>
                <p className='whitespace-pre-line'>{event.description}</p>
              </div>
              <EventImage event={event} />
            </div>
            <div className='mt-8 flex items-center justify-between gap-4'>
              <Suspense fallback={<AttendeesLoading />}>
                <Attendees event={event} supabase={supabase} />
              </Suspense>
              <EventRsvpStatus event={event} className="ml-2 self-end sm:hidden" />
            </div>
          </div>
        </Container>
      ))}
    </>
  );
}

export function EventsLoading() {
  return (
    <div className="min-h-80 rounded-2xl border-[0.0625rem] border-border-color bg-background-light p-6 shadow-lg shadow-[#00000007] max-sm:p-4">
      <div className="h-8 animate-pulse rounded bg-border-color" />
      <div className="mt-6 h-6 max-w-[60%] animate-pulse rounded bg-border-color" />
      <div className="mt-2 h-6 max-w-[60%] animate-pulse rounded bg-border-color" />
      <div className="mt-6 min-h-40 animate-pulse rounded bg-border-color" />
      <div className="mt-8 min-h-8 max-w-[30%] animate-pulse rounded bg-border-color" />
    </div>
  )
}
