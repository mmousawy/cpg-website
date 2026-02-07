'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { formatEventDate, formatEventTime, isEventPast } from '@/components/events/EventCard';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/shared/Button';
import type { Tables } from '@/database.types';
import { useSupabase } from '@/hooks/useSupabase';
import CalendarSVG from 'public/icons/calendar2.svg';
import EditSVG from 'public/icons/edit.svg';
import LocationSVG from 'public/icons/location.svg';
import PlusSVG from 'public/icons/plus.svg';
import SadSVG from 'public/icons/sad.svg';
import TimeSVG from 'public/icons/time.svg';

type Event = Pick<Tables<'events'>, 'id' | 'slug' | 'title' | 'date' | 'time' | 'location' | 'description' | 'cover_image'>

export default function AdminEventsPage() {
  // Admin access is guaranteed by ProtectedRoute layout with requireAdmin
  const supabase = useSupabase();

  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      const { data } = await supabase
        .from('events')
        .select('id, slug, title, date, time, location, description, cover_image')
        .order('date', { ascending: false });

      setEvents(data || []);
      setIsLoading(false);
    };

    loadEvents();
  }, [supabase]);

  // Sort: upcoming (soonest first), then past (most recent first)
  const upcomingEvents = events
    .filter(e => !isEventPast(e.date))
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
  const pastEvents = events
    .filter(e => isEventPast(e.date))
    .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime());

  return (
    <PageContainer>
      <div
        className="mb-8 flex items-start justify-between gap-4"
      >
        <div>
          <h1
            className="text-2xl sm:text-3xl font-bold"
          >
            Manage events
          </h1>
          <p
            className="text-base sm:text-lg mt-2 text-foreground/70"
          >
            Create, edit, and delete events
          </p>
        </div>
        <Button
          href="/admin/events/new"
          icon={<PlusSVG
            className="h-5 w-5"
          />}
          variant="primary"
        >
          Create event
        </Button>
      </div>

      {isLoading ? (
        <div
          className="text-center animate-pulse py-12"
        >
          <p
            className="text-foreground/50"
          >
            Loading events...
          </p>
        </div>
      ) : events.length === 0 ? (
        <div
          className="text-center py-12"
        >
          <SadSVG
            className="mb-4 inline-block h-12 w-12 fill-foreground/50"
          />
          <p
            className="mb-4 text-foreground/80"
          >
            No events yet
          </p>
          <Button
            href="/admin/events/new"
            icon={<PlusSVG
              className="h-5 w-5"
            />}
          >
            Create your first event
          </Button>
        </div>
      ) : (
        <div
          className="space-y-10"
        >
          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <section>
              <h2
                className="mb-4 text-lg font-semibold opacity-70"
              >
                Upcoming events
              </h2>
              <div
                className="space-y-3"
              >
                {upcomingEvents.map((event) => (
                  <AdminEventCard
                    key={event.id}
                    event={event}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Past Events */}
          {pastEvents.length > 0 && (
            <section>
              <h2
                className="mb-4 text-lg font-semibold opacity-70"
              >
                Past events
              </h2>
              <div
                className="space-y-3"
              >
                {pastEvents.map((event) => (
                  <AdminEventCard
                    key={event.id}
                    event={event}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </PageContainer>
  );
}

function AdminEventCard({ event }: { event: Event }) {
  const imageSrc = event.cover_image;

  return (
    <div
      className="block rounded-xl border border-border-color bg-background-light p-3 sm:p-4 transition-colors hover:border-primary"
    >
      <div
        className="flex items-start gap-3 sm:gap-4"
      >
        {/* Clickable content area */}
        <Link
          href={`/events/${event.slug || event.id}`}
          className="flex-1 min-w-0"
        >
          <div
            className="flex items-start gap-3 sm:gap-4"
          >
            {/* Thumbnail */}
            {imageSrc && (
              <div
                className="relative h-16 w-24 sm:h-20 sm:w-32 shrink-0 overflow-hidden rounded-lg bg-background-light"
              >
                <Image
                  src={imageSrc}
                  alt={event.title || 'Event cover'}
                  sizes="256px"
                  loading="eager"
                  quality={85}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Content */}
            <div
              className="flex-1 min-w-0"
            >
              <h4
                className="font-semibold group-hover:text-primary transition-colors line-clamp-2 mb-1.5"
              >
                {event.title}
              </h4>
              <div
                className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-foreground/70"
              >
                {event.date && (
                  <span
                    className="flex items-center gap-1"
                  >
                    <CalendarSVG
                      className="size-3.5 fill-foreground/60"
                    />
                    {formatEventDate(event.date)}
                  </span>
                )}
                {event.time && (
                  <span
                    className="flex items-center gap-1"
                  >
                    <TimeSVG
                      className="size-3.5 fill-foreground/60"
                    />
                    {formatEventTime(event.time)}
                  </span>
                )}
                {event.location && (
                  <span
                    className="hidden sm:flex items-center gap-1"
                  >
                    <LocationSVG
                      className="size-3.5 fill-foreground/60"
                    />
                    <span
                      className="line-clamp-1"
                    >
                      {event.location.split('\n')[0]}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>

        {/* Edit button - separate from clickable area */}
        <div
          className="shrink-0 flex items-center gap-2"
        >
          <Link
            href={`/admin/events/${event.slug || event.id}`}
            className="rounded-full border border-border-color-strong bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary hover:text-primary flex items-center gap-1.5"
          >
            <EditSVG
              className="size-4 fill-current"
            />
            Edit
          </Link>
        </div>
      </div>
    </div>
  );
}
