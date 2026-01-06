import Link from 'next/link';
import Image from 'next/image';
import crypto from 'crypto';
import clsx from 'clsx';

import CalendarSVG from 'public/icons/calendar2.svg';
import LocationSVG from 'public/icons/location.svg';
import SadSVG from 'public/icons/sad.svg';
import TimeSVG from 'public/icons/time.svg';
import EventRsvpStatus from './EventRsvpStatus';
import EventImage from './EventImage';
import Container from '../layout/Container';

import type { CPGEvent } from '@/types/events';

type Attendee = {
  id: string
  event_id: number
  user_id: string | null
  email: string
  confirmed_at: string
  profiles: { avatar_url: string | null } | null
}

type EventsListProps = {
  events: CPGEvent[]
  attendeesByEvent: Record<number, Attendee[]>
  emptyMessage?: string
}

// Inline attendees display component (no data fetching)
function AttendeesDisplay({ attendees, isPastEvent }: { attendees: Attendee[], isPastEvent: boolean }) {
  if (!attendees || attendees.length === 0) {
    return (
      <div className='text-[15px] font-semibold text-foreground/70 leading-6'>
        {isPastEvent ? 'No attendees recorded' : 'No attendees yet — join and be the first!'}
      </div>
    );
  }

  // Get avatar URL for each attendee
  const attendeesWithAvatars = attendees.map((attendee) => {
    const customAvatar = attendee.profiles?.avatar_url;
    const gravatarUrl = `https://gravatar.com/avatar/${crypto.createHash('md5').update(attendee.email || '').digest("hex")}?s=64`;
    return {
      ...attendee,
      avatarUrl: customAvatar || gravatarUrl
    };
  });

  return (
    <div className='flex gap-2 max-sm:flex-col-reverse max-sm:gap-1 max-sm:text-sm sm:items-center'>
      <div className='relative flex max-w-96 flex-row-reverse overflow-hidden pr-2 drop-shadow max-md:max-w-[19rem] max-xs:max-w-44' dir="rtl">
        {attendeesWithAvatars.map((attendee, attendeeIndex) => (
          <Image
            key={`${attendee.id}_${attendeeIndex}`}
            width={32}
            height={32}
            className={clsx([
              attendeesWithAvatars.length > 1 && "-mr-2",
              "size-8 rounded-full object-cover"
            ])}
            src={attendee.avatarUrl}
            alt="Avatar"
          />
        ))}
        <div
          className={clsx([
            "absolute -right-0 z-50 size-8 bg-gradient-to-r from-transparent to-background-light",
            attendeesWithAvatars.length < 20 && "invisible",
            attendeesWithAvatars.length > 7 && "max-xs:visible",
            attendeesWithAvatars.length > 12 && "max-md:visible",
            attendeesWithAvatars.length > 16 && "!visible",
          ])}
        />
      </div>
      {attendeesWithAvatars.length} attendee{attendeesWithAvatars.length === 1 ? '' : 's'}
    </div>
  );
}

export default function EventsList({ events, attendeesByEvent, emptyMessage }: EventsListProps) {
  if (!events || events.length === 0) {
    return (
      <Container className="text-center">
        <p className="text-foreground/80">
          <SadSVG className="inline align-top h-6 w-6 mr-2 fill-foreground/80" /> 
          {emptyMessage || 'No events found'}
        </p>
      </Container>
    );
  }

  // Check if event is past
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return (
    <>
      {events.map((event) => {
        const eventDate = event.date ? new Date(event.date) : null;
        if (eventDate) eventDate.setHours(0, 0, 0, 0);
        const isPastEvent = eventDate ? eventDate < now : false;
        const attendees = attendeesByEvent[event.id] || [];

        return (
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
                    <span className='flex gap-2'>
                      <CalendarSVG className="shrink-0 fill-foreground" />
                      {new Date(event.date!).toLocaleString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className='flex gap-2'>
                      <TimeSVG className="shrink-0 fill-foreground" />
                      {event.time?.substring(0, 5)}
                    </span>
                  </span>
                  <span className='mb-6 flex items-start gap-2 whitespace-pre-wrap text-[15px] font-semibold leading-6 max-sm:hidden'>
                    <LocationSVG className="shrink-0 fill-foreground" />
                    {event.location?.split('\n')[0] ?? ''}
                  </span>
                  <span className='mb-6 flex items-start gap-2 whitespace-pre-wrap text-[15px] font-semibold max-sm:mb-6 sm:hidden'>
                    <LocationSVG className="shrink-0 fill-foreground" />
                    {event.location}
                  </span>
                  <p className='whitespace-pre-line'>{event.description}</p>
                </div>
                <EventImage event={event} />
              </div>
              <div className='mt-8 flex items-center justify-between gap-4'>
                <AttendeesDisplay attendees={attendees} isPastEvent={isPastEvent} />
                <EventRsvpStatus event={event} className="ml-2 self-end sm:hidden" />
              </div>
            </div>
          </Container>
        );
      })}
    </>
  );
}
