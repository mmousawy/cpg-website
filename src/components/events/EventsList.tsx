import clsx from 'clsx';
import crypto from 'crypto';
import Image from 'next/image';
import Link from 'next/link';

import CalendarSVG from 'public/icons/calendar2.svg';
import LocationSVG from 'public/icons/location.svg';
import SadSVG from 'public/icons/sad.svg';
import TimeSVG from 'public/icons/time.svg';
import { isEventPast } from './EventCard';
import EventImage from './EventImage';

import type { CPGEvent, EventAttendee } from '@/types/events';

type EventsListProps = {
  events: CPGEvent[]
  attendeesByEvent: Record<number, EventAttendee[]>
  emptyMessage?: string
  /**
   * Server timestamp for determining if events are past.
   * REQUIRED when using Cache Components to avoid Date.now() during render.
   */
  serverNow: number
}

// Inline attendees display component (no data fetching)
function AttendeesDisplay({ attendees, isPastEvent }: { attendees: EventAttendee[], isPastEvent: boolean }) {
  if (!attendees || attendees.length === 0) {
    return (
      <div className='text-sm font-semibold text-foreground/70 leading-6'>
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
      avatarUrl: customAvatar || gravatarUrl,
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
              "size-8 rounded-full object-cover",
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

export default function EventsList({ events, attendeesByEvent, emptyMessage, serverNow }: EventsListProps) {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 rounded-xl border border-dashed border-border-color">
        <p className="text-foreground/80">
          <SadSVG className="inline align-top h-6 w-6 mr-2 fill-foreground/80" />
          {emptyMessage || 'No events found'}
        </p>
      </div>
    );
  }

  return (
    <>
      {events.map((event) => {
        const isPast = isEventPast(event.date, serverNow);
        const attendees = attendeesByEvent[event.id] || [];

        return (
          <div
            key={event.id}
            className={clsx(
              "rounded-xl border bg-background-light p-4 sm:p-6 border-border-color",
            )}
          >
            <div className={clsx(isPast && "grayscale")}>
              <EventImage event={event} size='small' />
            </div>
            <div className='mb-6 flex justify-between'>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {isPast && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2.5 py-1 text-xs font-medium text-foreground/60 whitespace-nowrap">
                      Past event
                    </span>
                  )}
                </div>
                <Link href={`/events/${event.slug}`} className="group">
                  <h3 className={clsx(
                    "text-2xl font-bold transition-colors md:max-w-140",
                    isPast
                      ? "text-foreground/70 group-hover:text-foreground/90"
                      : "group-hover:text-primary",
                  )}>
                    {event.title}
                  </h3>
                </Link>
              </div>
              <Link
                href={`/events/${event.slug}`}
                className={clsx(
                  "ml-2 max-sm:hidden self-start rounded-full border px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap",
                  isPast
                    ? "border-border-color-strong bg-background text-foreground/70 hover:border-border-color hover:bg-background-light"
                    : "border-primary bg-primary text-white hover:border-primary-alt hover:bg-primary-alt hover:text-slate-950",
                )}
              >
                View event
              </Link>
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
                <p className='whitespace-pre-line line-clamp-5'>{event.description}</p>
              </div>
              <EventImage event={event} />
            </div>
            <div className='mt-8 flex items-end justify-between gap-4'>
              <AttendeesDisplay attendees={attendees} isPastEvent={isPast} />
              <Link
                href={`/events/${event.slug}`}
                className={clsx(
                  "ml-2 self-end sm:hidden rounded-full border px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap",
                  isPast
                    ? "border-border-color-strong bg-background text-foreground/70 hover:border-border-color hover:bg-background-light"
                    : "border-primary bg-primary text-white hover:border-primary-alt hover:bg-primary-alt hover:text-slate-950",
                )}
              >
                View event
              </Link>
            </div>
          </div>
        );
      })}
    </>
  );
}
