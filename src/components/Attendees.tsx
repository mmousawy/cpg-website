import Image from 'next/image';
import crypto from 'crypto';

import clsx from 'clsx';

import { SupabaseClient } from '@supabase/supabase-js';

import { CPGEvent } from './Events';

export default async function Attendees({ event, supabase }: Readonly<{ event: CPGEvent, supabase: SupabaseClient }>) {
  const { data: attendees } = await supabase
    .from("events_rsvps")
    .select()
    .is("canceled_at", null)
    .not("confirmed_at", "is", null)
    .eq("event_id", event.id);

  return (
    <>
      {!attendees || attendees?.length === 0 && (
        <div className='text-[15px] font-semibold leading-6'>No attendees yet &mdash; join and be the first!</div>
      )}
      {!!attendees?.length && (
        <div className='flex gap-3 max-sm:flex-col-reverse max-sm:gap-2 max-sm:text-sm sm:items-center'>
          <div className='relative flex max-w-96 flex-row-reverse overflow-hidden pr-2 drop-shadow max-md:max-w-[19rem] max-xs:max-w-44' dir="rtl">
            {/* Avatar list of attendees */}
            {attendees?.map((attendee, attendeeIndex) => (
              <Image
                key={`${attendee.uuid}_${attendeeIndex}` }
                width={32}
                height={32}
                className={clsx([
                  (attendees?.length || 0) > 1 && "-mr-2",
                  "size-8 rounded-full"
                ])}
                src={`https://gravatar.com/avatar/${crypto.createHash('md5').update(attendee.email || '').digest("hex")}?s=64`} alt="Gravatar"
              />
            ))}

            <div
              // Fade to background-light color
              className={clsx([
                "absolute -right-0 z-50 size-8 bg-gradient-to-r from-transparent to-background-light",
                attendees?.length < 20 && "invisible",
                attendees?.length > 7 && "max-xs:visible",
                attendees?.length > 12 && "max-md:visible",
                attendees?.length > 16 && "!visible",
              ])}
            />
          </div>
          {attendees?.length} attendee{attendees?.length === 1 ? '' : 's'}
        </div>
      )}
    </>
  )
}

export function AttendeesLoading() {
  return (
    <div className="min-h-8 max-w-[30%] animate-pulse rounded bg-border-color" />
  )
}
