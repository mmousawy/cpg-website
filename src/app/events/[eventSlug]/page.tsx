import Avatar from '@/components/auth/Avatar';
import AddToCalendar from '@/components/events/AddToCalendar';
import EventSignupBar from '@/components/events/EventSignupBar';
import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import BlurImage from '@/components/shared/BlurImage';
import StackedAvatarsPopover, { type AvatarPerson } from '@/components/shared/StackedAvatarsPopover';
import type { Tables } from '@/database.types';
import crypto from 'crypto';
import { cacheLife, cacheTag } from 'next/cache';
import Link from 'next/link';
import { notFound } from 'next/navigation';

// Cached data functions
import { getAllEventSlugs, getEventAttendeesForEvent, getEventBySlug } from '@/lib/data/events';
import { getOrganizers } from '@/lib/data/profiles';
import { createMetadata } from '@/utils/metadata';

import CalendarSVG from 'public/icons/calendar2.svg';
import LocationSVG from 'public/icons/location.svg';
import TimeSVG from 'public/icons/time.svg';

import EventComments from './EventComments';

// Type for attendee with joined profile data
type AttendeeWithProfile = Pick<Tables<'events_rsvps'>, 'id' | 'email'> & {
  profiles: Pick<Tables<'profiles'>, 'avatar_url' | 'full_name' | 'nickname'> | null
}

// Pre-render all events at build time for optimal caching
export async function generateStaticParams() {
  const slugs = await getAllEventSlugs();
  return slugs.map((eventSlug) => ({ eventSlug }));
}

export async function generateMetadata({ params }: { params: Promise<{ eventSlug: string }> }) {
  const resolvedParams = await params;
  const eventSlug = resolvedParams?.eventSlug || '';

  if (!eventSlug) {
    return createMetadata({
      title: 'Event not found',
      description: 'The requested event could not be found',
    });
  }

  // Use cached function for metadata
  const { event } = await getEventBySlug(eventSlug);

  if (!event) {
    return createMetadata({
      title: 'Event not found',
      description: 'The requested event could not be found',
    });
  }

  // Use event cover image if available, otherwise fall back to default
  const eventImage = event.cover_image || null;

  return createMetadata({
    title: event.title || 'Event',
    description: event.description || `Join us for ${event.title || 'this event'}`,
    image: eventImage,
    canonical: `/events/${eventSlug}`,
    type: 'article',
    keywords: ['photography event', 'meetup', 'photo walk', event.location || '', event.title || ''],
  });
}

// Transform attendees to AvatarPerson format for the shared component
function transformAttendeesToAvatarPeople(attendees: AttendeeWithProfile[]): AvatarPerson[] {
  return attendees.map((attendee) => {
    const customAvatar = attendee.profiles?.avatar_url;
    const gravatarUrl = `https://gravatar.com/avatar/${crypto.createHash('md5').update(attendee.email || '').digest('hex')}?s=64`;
    return {
      id: attendee.id.toString(),
      avatarUrl: customAvatar || gravatarUrl,
      fullName: attendee.profiles?.full_name || null,
      nickname: attendee.profiles?.nickname || null,
    };
  });
}

// Inline attendees display component
function AttendeesDisplay({ attendees, isPastEvent }: {
  attendees: AttendeeWithProfile[]
  isPastEvent: boolean
}) {
  if (!attendees || attendees.length === 0) {
    return (
      <div
        className='text-sm font-semibold text-foreground/70 leading-6'
      >
        {isPastEvent ? 'No attendees recorded' : 'No attendees yet — join and be the first!'}
      </div>
    );
  }

  const attendeePeople = transformAttendeesToAvatarPeople(attendees);

  return (
    <StackedAvatarsPopover
      people={attendeePeople}
      singularLabel="attendee"
      pluralLabel="attendees"
      emptyMessage={isPastEvent ? 'No attendees recorded' : 'No attendees yet'}
      showInlineCount={true}
      avatarSize="sm"
      maxVisibleAvatarsMobile={12}
      showCountOnMobile={true}
    />
  );
}

// Fetch data OUTSIDE cache to handle 404 properly
export default async function EventDetailPage({ params }: { params: Promise<{ eventSlug: string }> }) {
  const resolvedParams = await params;
  const eventSlug = resolvedParams?.eventSlug || '';

  if (!eventSlug) {
    notFound();
  }

  // Fetch event outside cache to handle 404
  const eventData = await getEventBySlug(eventSlug);
  const { event, serverNow } = eventData;

  if (!event) {
    notFound();
  }

  // Pass to cached content component
  return <CachedEventContent
    event={event}
    serverNow={serverNow}
  />;
}

// Separate cached component for the content
async function CachedEventContent({
  event,
  serverNow,
}: {
  event: NonNullable<Awaited<ReturnType<typeof getEventBySlug>>['event']>;
  serverNow: number;
}) {
  'use cache';

  cacheLife('max');
  cacheTag('events');

  // Fetch hosts and attendees using cached functions
  const [hosts, attendees] = await Promise.all([
    getOrganizers(5),
    getEventAttendeesForEvent(event.id),
  ]);

  // Format the event date
  const eventDate = event.date ? new Date(event.date) : null;
  const formattedDate = eventDate
    ? eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    : 'Date TBD';

  // Format time
  const formattedTime = event.time ? event.time.substring(0, 5) : 'Time TBD';

  // Check if event is in the past using server timestamp from cache
  const serverDate = new Date(serverNow);
  serverDate.setHours(0, 0, 0, 0);
  const isPastEvent = eventDate ? eventDate < serverDate : false;

  return (
    <>
      {/* Hero Section with Cover Image */}
      {event.cover_image && (
        <div
          className="relative h-[clamp(14rem,25svw,20rem)] w-full overflow-hidden"
        >
          <BlurImage
            src={event.cover_image}
            alt={event.title || 'Event cover'}
            fill
            className="object-cover"
            sizes="100vw"
            preload
            blurhash={event.image_blurhash}
          />

          {/* Frosted glass blur layer with eased gradient mask */}
          <div
            className="absolute inset-x-0 bottom-0 h-full backdrop-blur-md scrim-gradient-mask-strong"
          />

          {/* Eased gradient overlay */}
          <div
            className="absolute inset-x-0 bottom-0 h-full scrim-gradient-overlay-strong"
          />

          {/* Title overlay */}
          <div
            className="absolute inset-x-0 bottom-0 px-2 pb-0 sm:px-8 sm:pb-4"
          >
            <div
              className="mx-auto max-w-screen-md"
            >
              {isPastEvent && (
                <span
                  className="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-sm"
                >
                  Past event
                </span>
              )}
              {!isPastEvent && (
                <span
                  className="mb-2 inline-block rounded-full bg-primary/60 px-3 py-1 text-xs font-medium text-[#fff] backdrop-blur-sm"
                >
                  Upcoming event
                </span>
              )}
              <h1
                className="text-3xl font-bold sm:text-4xl md:text-5xl"
              >
                {event.title}
              </h1>
            </div>
          </div>
        </div>
      )}

      <PageContainer
        className={event.cover_image ? '!pt-6 sm:!pt-8' : ''}
      >
        <Container>
          {/* Title (if no cover image) */}
          {!event.cover_image && (
            <div
              className="mb-6"
            >
              {isPastEvent && (
                <span
                  className="mb-2 inline-block rounded-full bg-foreground/10 px-3 py-1 text-xs font-medium"
                >
                  Past event
                </span>
              )}
              <h1
                className="text-3xl font-bold sm:text-4xl"
              >
                {event.title}
              </h1>
            </div>
          )}

          {/* Event Info - Date, Time, Location */}
          <div
            className="mb-8 space-y-3"
          >
            {/* Date & Time */}
            <div
              className="flex flex-wrap items-center gap-x-6 gap-y-2"
            >
              <span
                className="flex items-center gap-2 text-[15px] font-semibold"
              >
                <CalendarSVG
                  className="size-5 shrink-0 fill-foreground"
                />
                {formattedDate}
              </span>
              <span
                className="flex items-center gap-2 text-[15px] font-semibold"
              >
                <TimeSVG
                  className="size-5 shrink-0 fill-foreground"
                />
                {formattedTime}
              </span>
            </div>

            {/* Location */}
            {event.location && (
              <div
                className="flex items-start gap-2 text-[15px] font-semibold"
              >
                <LocationSVG
                  className="size-5 shrink-0 fill-foreground mt-0.5"
                />
                <span
                  className="whitespace-pre-wrap"
                >
                  {event.location}
                </span>
              </div>
            )}

            {/* Capacity info */}
            {event.max_attendees && (
              <p
                className="text-sm text-foreground/70"
              >
                {event.rsvp_count || 0}
                {' '}
                /
                {event.max_attendees}
                {' '}
                spots filled
              </p>
            )}
          </div>

          {/* Description Section */}
          {event.description && (
            <div
              className="mb-8"
            >
              <h2
                className="mb-3 text-lg font-semibold"
              >
                About this event
              </h2>
              <p
                className="whitespace-pre-line text-foreground/90 leading-relaxed max-w-[50ch]"
              >
                {event.description}
              </p>
            </div>
          )}

          {/* Hosts Section */}
          {hosts && hosts.length > 0 && (
            <div
              className="mb-8"
            >
              <h2
                className="mb-3 text-lg font-semibold"
              >
                Hosts
              </h2>
              <div
                className="flex flex-wrap gap-4"
              >
                {hosts.map((host) => (
                  <Link
                    key={host.id}
                    href={host.nickname ? `/@${host.nickname}` : '#'}
                    className="flex items-center gap-3 rounded-lg group"
                  >
                    <Avatar
                      avatarUrl={host.avatar_url}
                      fullName={host.full_name}
                      size="md"
                      hoverEffect
                    />
                    <div>
                      <p
                        className="font-medium group-hover:text-primary transition-colors"
                      >
                        {host.full_name || 'Host'}
                      </p>
                      {host.nickname && (
                        <p
                          className="text-sm opacity-70 group-hover:opacity-100 group-hover:text-primary transition-colors"
                        >
                          @
                          {host.nickname}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Add to Calendar */}
          {!isPastEvent && (
            <div
              className="mb-8"
            >
              <AddToCalendar
                event={event}
              />
            </div>
          )}

          {/* Attendees Section */}
          <div>
            <h2
              className="mb-3 text-lg font-semibold"
            >
              Attendees
            </h2>
            <AttendeesDisplay
              attendees={attendees || []}
              isPastEvent={isPastEvent}
            />
          </div>
        </Container>
      </PageContainer>

      {/* Sticky Action Bar - only show for upcoming events */}
      {!isPastEvent && <EventSignupBar
        event={event}
      />}

      {/* Comments Section */}
      <PageContainer
        variant="alt"
        className="border-t border-t-border-color"
      >
        <EventComments
          eventId={String(event.id)}
        />
      </PageContainer>

    </>
  );
}
