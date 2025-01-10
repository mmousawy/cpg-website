import Image from 'next/image';

import { Database } from '@/database.types';

import { createClient } from '@/utils/supabase/server';

import Attendees, { AttendeesLoading } from './Attendees';

import CalendarSVG from 'public/icons/calendar2.svg';
import LocationSVG from 'public/icons/location.svg';
import TimeSVG from 'public/icons/time.svg';
import SignupButton from './SignupButton';
import { Suspense } from 'react';

export type CPGEvent = Database['public']['Tables']['events']['Row'];

export default async function Events() {
  const supabase = await createClient();

  const response = await supabase.from("events").select();
  const events = response.data;

  return (
    <section
      className="flex justify-center bg-background px-6 pb-10 pt-8 text-foreground sm:p-12 sm:pb-14"
    >
      <div className="w-full max-w-screen-md">
        <h2 className="mb-4 text-lg font-bold leading-tight opacity-70">Upcoming meetups</h2>
        <div className="grid gap-6">

          {events && events.map((event) => (
            <div key={event.id} className="rounded-lg border-[0.0625rem] border-border-color bg-background-light p-6 shadow-lg shadow-[#00000007] max-sm:p-4">
              <div>
                <Image
                  width={320}
                  height={240}
                  alt='Event cover image'
                  className='mb-4 h-28 w-full rounded-md object-cover max-sm:block sm:hidden'
                  src={event.cover_image!}
                />
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
                  <Image
                    width={640}
                    height={640}
                    alt='Event cover image'
                    className='size-60 rounded-md object-cover max-sm:hidden'
                    src={event.cover_image!}
                  />
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

        </div>
      </div>
    </section>
  );
}

export function EventsLoading() {
  return (
    <section
      className="flex justify-center bg-background px-6 pb-10 pt-8 text-foreground sm:p-12 sm:pb-14"
    >
      <div className="w-full max-w-screen-md">
        <h2 className="mb-4 text-lg font-bold leading-tight opacity-70">Upcoming meetups</h2>

        <div className="min-h-80 rounded-lg border-[0.0625rem] border-border-color bg-background-light p-6 shadow-lg shadow-[#00000007] max-sm:p-4">
          <div className="h-8 animate-pulse rounded bg-border-color" />
          <div className="mt-6 h-6 max-w-[60%] animate-pulse rounded bg-border-color" />
          <div className="mt-2 h-6 max-w-[60%] animate-pulse rounded bg-border-color" />
          <div className="mt-6 min-h-40 animate-pulse rounded bg-border-color" />
          <div className="mt-8 min-h-8 max-w-[30%] animate-pulse rounded bg-border-color" />
        </div>
      </div>
    </section>
  )
}
