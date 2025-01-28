import { createClient } from '@/utils/supabase/server';

import Attendees, { AttendeesLoading } from './Attendees';

import CalendarSVG from 'public/icons/calendar2.svg';
import LocationSVG from 'public/icons/location.svg';
import SadSVG from 'public/icons/sad.svg';
import TimeSVG from 'public/icons/time.svg';
import SignupButton from './SignupButton';
import { Suspense } from 'react';
import getImgDimensions from '@/utils/utils';
import EventImage from './EventImage';

export default async function Events({filter}: {filter: 'upcoming' | 'past'}) {
  const supabase = await createClient();

  const response = await supabase.from("events").select();
  const events = response.data;

  // Filter events based on the filter prop
  const now = new Date();

  const filteredEvents = events?.filter((event) => {
    const eventDate = new Date(event.date!);
    return filter === 'upcoming' ? eventDate >= now : eventDate < now;
  });

  const enrichedEvents = await Promise.all(
    filteredEvents?.map(async (event) => {
      const dimensions = await getImgDimensions(event.cover_image!);

      return {
        ...event,
        dimensions,
      };
    }) ?? []
  );

  return (
    <>
      {!enrichedEvents || enrichedEvents.length === 0 && (
        <div className="flex min-h-28 justify-center rounded-lg border-[0.0625rem] border-border-color bg-background-light fill-foreground p-6 text-foreground shadow-lg shadow-[#00000007] max-sm:p-4">
          <p className='flex items-center justify-center gap-2'><SadSVG /> No events found</p>
        </div>
      )}
      {enrichedEvents && enrichedEvents.map((event) => (
        <div id={`gallery-${event.id}`} key={event.id} className="rounded-lg border-[0.0625rem] border-border-color bg-background-light p-6 shadow-lg shadow-[#00000007] max-sm:p-4">
          <div>
            <EventImage event={event} size='small' />
            <div className='mb-6 flex justify-between'>
              <h3 className="text-2xl font-bold">{event.title}</h3>
              <SignupButton event={event} className="ml-2 max-sm:hidden" />
            </div>
            <div className='flex gap-6'>
              <div>
                <span className='mb-2 flex gap-4 text-[15px] font-semibold leading-6 max-sm:mb-2'>
                  <span className='flex gap-2'><CalendarSVG className="shrink-0 fill-foreground" />
                    {new Date(event.date!).toLocaleString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'})}
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
              <SignupButton event={event} className="ml-2 self-end sm:hidden" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

export function EventsLoading() {
  return (
    <div className="min-h-80 rounded-lg border-[0.0625rem] border-border-color bg-background-light p-6 shadow-lg shadow-[#00000007] max-sm:p-4">
      <div className="h-8 animate-pulse rounded bg-border-color" />
      <div className="mt-6 h-6 max-w-[60%] animate-pulse rounded bg-border-color" />
      <div className="mt-2 h-6 max-w-[60%] animate-pulse rounded bg-border-color" />
      <div className="mt-6 min-h-40 animate-pulse rounded bg-border-color" />
      <div className="mt-8 min-h-8 max-w-[30%] animate-pulse rounded bg-border-color" />
    </div>
  )
}
