import { createClient } from '@/utils/supabase/server';
import Image from 'next/image';
import crypto from 'crypto';
import { Database } from '../../../database.types';

import CalendarSVG from 'public/icons/calendar2.svg';
import LocationSVG from 'public/icons/location.svg';
import TimeSVG from 'public/icons/time.svg';
import SignupButton from './SignupButton';

type ExtendedEvent = Database['public']['Tables']['events']['Row'] & {
  attendees?: Database['public']['Tables']['events_rsvps']['Row'][];
};

export default async function Events() {
  const supabase = await createClient();

  const response = await supabase.from("events").select();
  const events = response.data as ExtendedEvent[];

  const promises = events.map(async (event) => {
    // Get the attendees for each event
    const { data: attendees } = await supabase.from("events_rsvps").select().eq("event_id", event.id);

    event.attendees = attendees!;
  });

  await Promise.all(promises!);

  return (
    <section
      className="flex justify-center bg-background p-6 text-foreground sm:p-12"
    >
      <div className="w-full max-w-screen-md">
        <h2 className="mb-4 font-[family-name:var(--font-geist-mono)] font-bold leading-tight max-sm:text-lg sm:text-lg">Upcoming meetups</h2>
        <div className="grid gap-4">

          {events && events.map((event) => (
            <div key={event.id} className="rounded-lg border-[0.0625rem] border-border-color bg-background-light p-6 max-sm:p-4">
              <div>
                <Image
                  width={320}
                  height={240}
                  alt='Event cover image'
                  className='mb-4 h-28 w-full rounded-md object-cover max-sm:block sm:hidden'
                  src={event.cover_image!}
                />
                <div className='mb-6 flex justify-between max-sm:mb-4'>
                  <h3 className="text-2xl font-bold max-sm:text-xl">{event.title}</h3>
                  <SignupButton className="ml-2 max-sm:hidden" />
                </div>
                <div className='flex gap-6'>
                  <div>
                    <span className='mb-2 flex gap-4 text-sm font-semibold leading-6 max-sm:mb-2 max-sm:flex-col max-sm:gap-2'>
                      <span className='flex gap-2'><CalendarSVG className="shrink-0 fill-foreground max-sm:mt-1 max-sm:size-4" />{new Date(event.date!).toLocaleString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'})}</span>
                      <span className='flex gap-2'><TimeSVG className="shrink-0 fill-foreground max-sm:mt-1 max-sm:size-4" />{event.time}</span>
                    </span>
                    <span className='mb-4 flex items-start gap-2 whitespace-pre-wrap text-sm font-semibold leading-6 max-sm:hidden'>
                      <LocationSVG className="shrink-0 fill-foreground max-sm:mt-1 max-sm:size-4" /> {event.location?.replace(/\r\n/gm, ' • ')}
                    </span>
                    <span className='mb-6 flex items-start gap-2 whitespace-pre-wrap text-sm font-semibold leading-6 max-sm:mb-4 sm:hidden'>
                      <LocationSVG className="shrink-0 fill-foreground max-sm:mt-1 max-sm:size-4" /> {event.location}
                    </span>
                    <p className='whitespace-pre-line max-sm:text-[15px]'>{event.description}</p>
                  </div>
                  <Image
                    width={640}
                    height={640}
                    alt='Event cover image'
                    className='size-60 rounded-md object-cover max-sm:hidden'
                    src={event.cover_image!}
                  />
                </div>
                <div className='mt-6 flex items-center justify-between max-sm:mt-4'>
                  <div className='flex items-center gap-2 max-sm:text-sm'>
                    <div className='mr-3 flex flex-row-reverse max-sm:mr-2'>
                      {/* Avatar list of attendees */}
                      {event.attendees?.reverse().map((attendee) => (
                        <Image
                          key={attendee.email}
                          width={32}
                          height={32}
                          className="z-10 -mr-2 size-8 rounded-full shadow"
                          src={`https://gravatar.com/avatar/${crypto.createHash('md5').update(attendee.email || '').digest("hex")}?s=64`} alt="Gravatar"
                        />
                      ))}
                    </div>
                    {event.attendees?.length} attendee{event.attendees?.length === 1 ? '' : 's'}
                  </div>
                  <SignupButton className="ml-2 sm:hidden" />
                </div>
              </div>
            </div>
          ))}

        </div>
      </div>
    </section>
  );
}
