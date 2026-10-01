'use client';

import clsx from 'clsx';
import dayjs from 'dayjs';
import Link from 'next/link';
import { startTransition, useEffect, useState } from 'react';

import EventsSectionHeading from '@/components/events/EventsSectionHeading';
import PageContainer from '@/components/layout/PageContainer';
import PageHeading from '@/components/layout/PageHeading';
import BlurImage from '@/components/shared/BlurImage';
import Button from '@/components/shared/Button';
import EmptyState from '@/components/shared/EmptyState';
import HelpLink from '@/components/shared/HelpLink';
import { routes } from '@/config/routes';
import type { Tables } from '@/database.types';
import { useAuth } from '@/hooks/useAuth';
import { useSupabase } from '@/hooks/useSupabase';
import { formatEventDate, formatEventTime, getDateSortValue } from '@/lib/events/format';
import { isEventPast } from '@/lib/events/status';
import { formatEventLocation, getGoogleMapsSearchUrl } from '@/utils/formatLocation';
import { THUMBNAIL_IMAGE_QUALITY, getCroppedThumbnailUrl } from '@/utils/supabaseImageLoader';
import ArrowRightSVG from 'public/icons/arrow-right.svg';
import CalendarSVG from 'public/icons/calendar2.svg';
import CancelSVG from 'public/icons/cancel.svg';
import CheckSVG from 'public/icons/check.svg';
import LocationChipSVG from 'public/icons/location-chip.svg';
import LocationSVG from 'public/icons/location.svg';
import SadSVG from 'public/icons/sad.svg';
import TimeSVG from 'public/icons/time.svg';

// RSVP with joined event data - use non-null date since we filter for valid events
type RSVP = Pick<Tables<'events_rsvps'>, 'id' | 'uuid' | 'confirmed_at' | 'canceled_at' | 'attended_at' | 'created_at'> & {
  events: Omit<Pick<Tables<'events'>, 'id' | 'title' | 'slug' | 'date' | 'time' | 'location' | 'cover_image' | 'description'>, 'date'> & {
    date: string  // Non-null since we only show events with valid dates
  }
}

export default function MyEventsPage() {
  // User is guaranteed by ProtectedRoute layout
  const { user } = useAuth();
  const supabase = useSupabase();

  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    startTransition(() => {
      setNow(Date.now());
    });
  }, []);

  const sevenDaysAgo = now != null ? now - 7 * 24 * 60 * 60 * 1000 : undefined;

  useEffect(() => {
    // User is guaranteed by ProtectedRoute layout
    if (!user) return;

    const loadRSVPs = async () => {
      try {
        const { data, error } = await supabase
          .from('events_rsvps')
          .select(`
            id,
            uuid,
            confirmed_at,
            canceled_at,
            attended_at,
            created_at,
            events (
              id,
              title,
              slug,
              date,
              time,
              location,
              cover_image,
              description
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading RSVPs:', error);
        } else {
          setRsvps((data as unknown as RSVP[]) || []);
        }
      } catch (err) {
        console.error('Unexpected error loading RSVPs:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadRSVPs();
  }, [user, supabase]);

  const upcomingRSVPs = rsvps
    .filter(r => now != null && !r.canceled_at && r.events && !isEventPast(r.events.date, now, r.events.time))
    .sort((a, b) => getDateSortValue(a.events.date) - getDateSortValue(b.events.date));

  const pastRSVPs = rsvps
    .filter(r => {
      if (now == null || !r.events) return false;
      if (r.canceled_at) return true;
      return isEventPast(r.events.date, now, r.events.time);
    })
    .sort((a, b) => getDateSortValue(b.events.date) - getDateSortValue(a.events.date));

  return (
    <PageContainer>
      <PageHeading
        title="My events"
        description="View and manage your event registrations"
        aside={
          <HelpLink
            href="rsvp"
            label="Help with events and RSVP"
            size="lg"
            className="max-sm:m-0"
          />
        }
      />

      {/* No-JS fallback */}
      <noscript>
        <style>
          {'.js-loading { display: none !important; }'}
        </style>
        <div
          className="text-center py-12"
        >
          <p
            className="text-lg font-medium mb-2"
          >
            JavaScript required
          </p>
          <p
            className="text-foreground/80"
          >
            Please enable JavaScript to view your event registrations.
          </p>
        </div>
      </noscript>

      <div
        className="space-y-6 sm:space-y-10"
      >
        <section>
          <EventsSectionHeading>
            Upcoming events &mdash; {upcomingRSVPs.length}
          </EventsSectionHeading>
          <div
            className="grid gap-3 sm:gap-6"
          >
            {isLoading ? (
              <div
                className="text-center animate-pulse js-loading py-12"
              >
                <p
                  className="text-foreground/50"
                >
                  Loading your events...
                </p>
              </div>
            ) : upcomingRSVPs.length === 0 ? (
              <EmptyState
                icon={<SadSVG
                  className="size-10 fill-foreground/80 inline-block"
                />}
                title="No upcoming events"
                action={(
                  <Button
                    href={routes.events.url}
                    size='sm'
                    iconRight={<ArrowRightSVG
                      className="-mr-1.5"
                    />}
                    className="rounded-full"
                  >
                    Browse events
                  </Button>
                )}
              />
            ) : (
              upcomingRSVPs.map((rsvp) => (
                <RsvpEventCard
                  key={rsvp.id}
                  rsvp={rsvp}
                  serverNow={now ?? Date.now()}
                  sevenDaysAgo={sevenDaysAgo}
                />
              ))
            )}
          </div>
        </section>

        {pastRSVPs.length > 0 && (
          <section>
            <EventsSectionHeading>
              Past events &mdash; {pastRSVPs.length}
            </EventsSectionHeading>
            <div
              className="grid gap-3 sm:gap-6"
            >
              {pastRSVPs.map((rsvp) => (
                <RsvpEventCard
                  key={rsvp.id}
                  rsvp={rsvp}
                  serverNow={now ?? Date.now()}
                  sevenDaysAgo={sevenDaysAgo}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </PageContainer>
  );
}

type RsvpBadgeVariant = 'going' | 'attended' | 'pending' | 'not_attended' | 'canceled';

function getRsvpBadgeVariant(
  rsvp: RSVP,
  serverNow: number,
  sevenDaysAgo: number | undefined,
): RsvpBadgeVariant {
  const event = rsvp.events;
  if (!event) return 'not_attended';
  if (rsvp.canceled_at) return 'canceled';
  if (!isEventPast(event.date, serverNow, event.time)) return 'going';
  if (rsvp.attended_at) return 'attended';
  if (sevenDaysAgo && dayjs(event.date).isAfter(dayjs(sevenDaysAgo))) {
    return 'pending';
  }
  return 'not_attended';
}

function rsvpBadgeLabel(variant: RsvpBadgeVariant): string {
  switch (variant) {
    case 'going':
      return "You're going";
    case 'attended':
      return 'Attended';
    case 'pending':
      return 'Pending confirmation';
    case 'not_attended':
      return 'Not attended';
    case 'canceled':
      return 'Canceled';
  }
}

function RsvpStatusBadge({
  variant,
  onImage,
}: {
  variant: RsvpBadgeVariant
  onImage: boolean
}) {
  const label = rsvpBadgeLabel(variant);

  if (onImage) {
    return (
      <span
        className={clsx(
          'absolute top-3 right-3 z-5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap shadow-sm [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]',
          variant === 'going' && 'bg-green-600/80 text-white backdrop-blur-sm',
          variant === 'attended' && 'bg-primary/80 text-white backdrop-blur-sm',
          variant === 'pending' && 'bg-orange-500/85 text-white backdrop-blur-sm',
          variant === 'not_attended' && 'bg-black/50 text-white backdrop-blur-sm',
          variant === 'canceled' && 'bg-red-600/85 text-white backdrop-blur-sm',
        )}
      >
        {variant === 'going' || variant === 'attended' ? (
          <CheckSVG
            className="size-3 shrink-0 fill-current"
          />
        ) : null}
        {variant === 'canceled' ? (
          <CancelSVG
            className="size-3 shrink-0 fill-current"
          />
        ) : null}
        {label}
      </span>
    );
  }

  return (
    <span
      className={clsx(
        'mb-3 inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap',
        variant === 'going' && 'bg-green-600/10 text-green-700 dark:text-green-500',
        variant === 'attended' && 'bg-primary/10 text-primary',
        variant === 'pending' && 'bg-orange-500/10 text-orange-600',
        variant === 'not_attended' && 'bg-foreground/10 text-foreground/60',
        variant === 'canceled' && 'bg-red-600/10 text-red-600',
      )}
    >
      {variant === 'going' || variant === 'attended' ? (
        <CheckSVG
          className={clsx(
            'size-3 shrink-0 fill-current',
            variant === 'going' && 'fill-green-700 dark:fill-green-500',
          )}
        />
      ) : null}
      {variant === 'canceled' ? (
        <CancelSVG
          className="size-3 shrink-0 fill-red-600"
        />
      ) : null}
      {label}
    </span>
  );
}

function RsvpEventCard({
  rsvp,
  serverNow,
  sevenDaysAgo,
}: {
  rsvp: RSVP
  serverNow: number
  sevenDaysAgo?: number
}) {
  const event = rsvp.events;

  if (!event) return null;

  const href = event.slug ? `/events/${event.slug}` : '#';
  const isPastEvent = isEventPast(event.date, serverNow, event.time);
  const badgeVariant = getRsvpBadgeVariant(rsvp, serverNow, sevenDaysAgo);
  const coverSrc = event.cover_image
    ? getCroppedThumbnailUrl(event.cover_image, 640, 360) || event.cover_image
    : null;

  return (
    <div
      className="rounded-xl border bg-background-light border-border-color overflow-hidden"
    >
      {coverSrc && (
        <Link
          href={href}
          className="relative block sm:hidden aspect-21/9"
          tabIndex={-1}
        >
          <BlurImage
            fill
            sizes="calc(100vw - 1.5rem)"
            loading="lazy"
            quality={THUMBNAIL_IMAGE_QUALITY}
            alt={event.title || 'Event cover image'}
            className="object-cover rounded-t-xl hover:brightness-90 transition-all duration-200"
            src={coverSrc}
          />
          <RsvpStatusBadge
            variant={badgeVariant}
            onImage
          />
        </Link>
      )}

      <div
        className="flex sm:flex-row flex-col"
      >
        <div
          className="flex-1 min-w-0 p-4 sm:p-6"
        >
          {!coverSrc && (
            <RsvpStatusBadge
              variant={badgeVariant}
              onImage={false}
            />
          )}

          <div
            className="mb-4 sm:mb-5"
          >
            <Link
              href={href}
              className="group"
            >
              <h3
                className={clsx(
                  'text-xl sm:text-2xl font-bold transition-colors md:max-w-140',
                  isPastEvent || rsvp.canceled_at
                    ? 'text-foreground/80 group-hover:text-foreground/90'
                    : 'group-hover:text-primary',
                )}
              >
                {event.title}
              </h3>
            </Link>
          </div>

          <div>
            <span
              className="mb-1 sm:mb-2 flex flex-wrap gap-x-5 sm:gap-x-4 gap-y-1 text-[15px] font-semibold leading-6"
            >
              {event.date && (
                <span
                  className="flex gap-2"
                >
                  <CalendarSVG
                    className="shrink-0 fill-foreground"
                  />
                  {formatEventDate(event.date, { includeYear: true, now: serverNow })}
                </span>
              )}
              {event.time && (
                <span
                  className="flex gap-2"
                >
                  <TimeSVG
                    className="shrink-0 fill-foreground"
                  />
                  {formatEventTime(event.time)}
                </span>
              )}
            </span>
            {event.location && (
              <span
                className="flex items-start gap-2 text-[15px] font-semibold leading-6"
              >
                <LocationSVG
                  className="shrink-0 fill-foreground"
                />
                <span
                  className="line-clamp-1"
                >
                  {formatEventLocation(event.location)}
                </span>
              </span>
            )}
          </div>

          <div
            className="mt-5 sm:mt-6 flex items-end justify-between gap-4"
          >
            {event.location ? (
              <Button
                href={getGoogleMapsSearchUrl(event.location)}
                target="_blank"
                rel="noopener noreferrer"
                variant="secondary"
                size="sm"
                icon={<LocationChipSVG className="size-5" />}
              >
                See location
              </Button>
            ) : (
              <span />
            )}
            <Button
              href={href}
              variant={isPastEvent || rsvp.canceled_at ? 'secondary' : 'primary'}
              size="sm"
              className="ml-2 self-end"
              aria-label={`View event: ${event.title}`}
            >
              View event
            </Button>
          </div>
        </div>

        {coverSrc && (
          <Link
            href={href}
            className="relative w-56 lg:w-72 shrink-0 max-sm:hidden self-stretch min-h-32"
            tabIndex={-1}
          >
            <BlurImage
              fill
              sizes="(min-width: 1024px) 576px, 448px"
              loading="lazy"
              quality={THUMBNAIL_IMAGE_QUALITY}
              alt={event.title || 'Event cover image'}
              className="object-cover rounded-r-xl hover:brightness-90 transition-all duration-200"
              src={coverSrc}
            />
            <RsvpStatusBadge
              variant={badgeVariant}
              onImage
            />
          </Link>
        )}
      </div>
    </div>
  );
}
