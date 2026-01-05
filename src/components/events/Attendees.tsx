import Image from 'next/image';
import crypto from 'crypto';

import clsx from 'clsx';

import { SupabaseClient } from '@supabase/supabase-js';

import { CPGEvent } from '@/types/events';

export default async function Attendees({ event, supabase }: Readonly<{ event: CPGEvent, supabase: SupabaseClient }>) {
  // Query confirmed attendees for this event
  // Note: Requires RLS policy to allow public viewing of confirmed RSVPs
  const { data: attendees, error } = await supabase
    .from("events_rsvps")
    .select(`
      id,
      user_id,
      email,
      confirmed_at,
      profiles (
        avatar_url
      )
    `)
    .eq("event_id", event.id)
    .not("confirmed_at", "is", null)
    .is("canceled_at", null)
    .order("confirmed_at", { ascending: true })
    .limit(100);

  if (error) {
    console.error('[Attendees] Error fetching attendees:', error);
  }

  // Check if event is in the past
  const isPastEvent = (() => {
    if (!event?.date) return false;
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return eventDate < now;
  })();

  if (!attendees || attendees.length === 0) {
    return (
      <div className='text-[15px] font-semibold text-foreground/70 leading-6'>
        {isPastEvent ? 'No attendees recorded' : 'No attendees yet — join and be the first!'}
      </div>
    );
  }

  // Get avatar URL for each attendee, prioritizing custom avatar from profile
  const attendeesWithAvatars = attendees.map((attendee) => {
    // First try custom avatar from profile
    const customAvatar = (attendee.profiles as any)?.avatar_url;

    // Fall back to Gravatar
    const gravatarUrl = `https://gravatar.com/avatar/${crypto.createHash('md5').update(attendee.email || '').digest("hex")}?s=64`;

    return {
      ...attendee,
      avatarUrl: customAvatar || gravatarUrl
    };
  });

  return (
    <>
      {!!attendeesWithAvatars?.length && (
        <div className='flex gap-2 max-sm:flex-col-reverse max-sm:gap-1 max-sm:text-sm sm:items-center'>
          <div className='relative flex max-w-96 flex-row-reverse overflow-hidden pr-2 drop-shadow max-md:max-w-[19rem] max-xs:max-w-44' dir="rtl">
            {/* Avatar list of attendees */}
            {attendeesWithAvatars?.map((attendee, attendeeIndex) => (
              <Image
                key={`${attendee.id}_${attendeeIndex}`}
                width={32}
                height={32}
                className={clsx([
                  (attendeesWithAvatars?.length || 0) > 1 && "-mr-2",
                  "size-8 rounded-full object-cover"
                ])}
                src={attendee.avatarUrl}
                alt="Avatar"
              />
            ))}

            <div
              // Fade to background-light color
              className={clsx([
                "absolute -right-0 z-50 size-8 bg-gradient-to-r from-transparent to-background-light",
                attendeesWithAvatars?.length < 20 && "invisible",
                attendeesWithAvatars?.length > 7 && "max-xs:visible",
                attendeesWithAvatars?.length > 12 && "max-md:visible",
                attendeesWithAvatars?.length > 16 && "!visible",
              ])}
            />
          </div>
          {attendeesWithAvatars?.length} attendee{attendeesWithAvatars?.length === 1 ? '' : 's'}
        </div>
      )}
    </>
  )
}

export function AttendeesLoading() {
  return (
    <div className="h-8 w-[30%] animate-pulse rounded bg-border-color" />
  )
}
