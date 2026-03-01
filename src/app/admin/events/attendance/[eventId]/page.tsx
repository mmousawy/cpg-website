'use client';

import clsx from 'clsx';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/shared/Button';
import type { Tables } from '@/database.types';
import { useSupabase } from '@/hooks/useSupabase';
import SadSVG from 'public/icons/sad.svg';

import CalendarSVG from 'public/icons/calendar2.svg';
import CheckSVG from 'public/icons/check.svg';
import CheckCircleSVG from 'public/icons/check-circle.svg';
import WarningSVG from 'public/icons/warning-micro.svg';
import LocationSVG from 'public/icons/location.svg';
import TimeSVG from 'public/icons/time.svg';

type RSVP = Pick<Tables<'events_rsvps'>,
  | 'id'
  | 'uuid'
  | 'name'
  | 'email'
  | 'confirmed_at'
  | 'canceled_at'
  | 'attended_at'
  | 'no_show_at'
  | 'created_at'
>

export default function AdminEventAttendancePage() {
  // Admin access is guaranteed by ProtectedRoute layout with requireAdmin
  const params = useParams();
  const eventId = parseInt(params.eventId as string);
  const supabase = useSupabase();

  type Event = Pick<Tables<'events'>, 'id' | 'title' | 'date' | 'time' | 'location'>;
  const [event, setEvent] = useState<Event | null>(null);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [markingId, setMarkingId] = useState<number | null>(null);

  const loadData = async () => {
    // Load event
    const { data: eventData } = await supabase
      .from('events')
      .select('id, title, date, time, location')
      .eq('id', eventId)
      .single();

    if (eventData) {
      setEvent(eventData as Event);
    }

    // Load RSVPs for this event
    const { data: rsvpsData } = await supabase
      .from('events_rsvps')
      .select('id, uuid, name, email, confirmed_at, canceled_at, attended_at, no_show_at, created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    setRsvps(rsvpsData || []);
    setIsLoading(false);
  };

  useEffect(() => {
    const loadDataAsync = async () => {
      // Load event
      const { data: eventData } = await supabase
        .from('events')
        .select('id, title, date, time, location')
        .eq('id', eventId)
        .single();

      if (eventData) {
        setEvent(eventData as Event);
      }

      // Load RSVPs for this event
      const { data: rsvpsData } = await supabase
        .from('events_rsvps')
        .select('id, uuid, name, email, confirmed_at, canceled_at, attended_at, no_show_at, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      setRsvps(rsvpsData || []);
      setIsLoading(false);
    };

    loadDataAsync();
  }, [eventId, supabase]);

  const handleMarkAttended = async (rsvpId: number) => {
    setMarkingId(rsvpId);

    const result = await fetch('/api/admin/mark-attendance', {
      method: 'POST',
      body: JSON.stringify({ rsvp_id: rsvpId, action: 'attended' }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (result.ok) {
      await loadData();
    }

    setMarkingId(null);
  };

  const handleMarkNoShow = async (rsvpId: number) => {
    setMarkingId(rsvpId);

    const result = await fetch('/api/admin/mark-attendance', {
      method: 'POST',
      body: JSON.stringify({ rsvp_id: rsvpId, action: 'no_show' }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (result.ok) {
      await loadData();
    }

    setMarkingId(null);
  };

  if (isLoading) {
    return (
      <PageContainer>
        <Container
          className="text-center animate-pulse"
        >
          <p
            className="text-foreground/50"
          >
            Loading attendance...
          </p>
        </Container>
      </PageContainer>
    );
  }

  if (!event) {
    return (
      <PageContainer>
        <Container>
          <h1
            className="mb-4 text-3xl font-bold"
          >
            Event not found
          </h1>
          <p
            className="text-foreground/70"
          >
            The event you&apos;re looking for doesn&apos;t exist.
          </p>
        </Container>
      </PageContainer>
    );
  }

  const confirmedRSVPs = rsvps.filter(r => r.confirmed_at && !r.canceled_at);
  const attendedRSVPs = rsvps.filter(r => r.attended_at);
  const noShowRSVPs = rsvps.filter(r => r.no_show_at);

  return (
    <PageContainer>
      <div
        className="mb-6"
      >
        <h1
          className="text-2xl sm:text-3xl font-bold"
        >
          Event attendance
        </h1>
        <p
          className="text-base sm:text-lg mt-2 text-foreground/70"
        >
          Manage attendee check-ins for this event
        </p>
        {event && (
          <div
            className="rounded-2xl border border-border-color bg-background-light p-4"
          >
            <h2
              className="mb-3 text-xl font-semibold"
            >
              {event.title}
            </h2>
            <div
              className="flex flex-wrap gap-4 text-sm text-foreground/70"
            >
              <span
                className="flex items-center gap-1"
              >
                <CalendarSVG
                  className="h-4 w-4 fill-foreground/70"
                />
                {event.date ? new Date(event.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }) : 'Date TBD'}
              </span>
              <span
                className="flex items-center gap-1"
              >
                <TimeSVG
                  className="h-4 w-4 fill-foreground/70"
                />
                {event.time?.substring(0, 5)}
              </span>
              <span
                className="flex items-center gap-1"
              >
                <LocationSVG
                  className="h-4 w-4 fill-foreground/70"
                />
                {event.location}
              </span>
            </div>
            <div
              className="mt-4 flex gap-4 text-sm"
            >
              <span
                className="font-medium text-foreground"
              >
                {confirmedRSVPs.length}
                {' '}
                confirmed
              </span>
              <span
                className="font-medium text-green-600"
              >
                {attendedRSVPs.length}
                {' '}
                attended
              </span>
              {noShowRSVPs.length > 0 && (
                <span
                  className="font-medium text-red-500"
                >
                  {noShowRSVPs.length}
                  {' '}
                  no-show
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div>
        <h2
          className="mb-4 text-lg font-semibold opacity-70"
        >
          RSVPs
        </h2>
        <Container>
          <div
            className="space-y-2"
          >
            {confirmedRSVPs.length === 0 ? (
              <div
                className="text-center"
              >
                <p
                  className="text-foreground/80"
                >
                  <SadSVG
                    className="inline align-top h-6 w-6 mr-2 fill-foreground/80"
                  />
                  {' '}
                  No confirmed RSVPs
                </p>
              </div>
            ) : (
              confirmedRSVPs.map((rsvp) => (
                <div
                  key={rsvp.id}
                  className={clsx(
                    'flex items-center justify-between rounded-lg border border-border-color p-3',
                    rsvp.attended_at && 'bg-green-500/5',
                    rsvp.no_show_at && !rsvp.attended_at && 'border-red-500/30 bg-red-500/5',
                  )}
                >
                  <div>
                    <p
                      className="font-medium"
                    >
                      {rsvp.name || 'Unknown'}
                    </p>
                    <p
                      className="text-sm text-foreground/60"
                    >
                      {rsvp.email}
                    </p>
                    {rsvp.no_show_at && !rsvp.attended_at && (
                      <p
                        className="text-xs font-medium text-red-500 mt-0.5"
                      >
                        No-show
                      </p>
                    )}
                  </div>
                  <div
                    className="flex items-center gap-2"
                  >
                    {rsvp.attended_at ? (
                      <span
                        className="flex items-center gap-1 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600"
                      >
                        <CheckSVG
                          className="h-3 w-3 fill-green-600"
                        />
                        Attended
                      </span>
                    ) : rsvp.no_show_at ? (
                      <span
                        className="flex items-center gap-1 rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-500"
                      >
                        <WarningSVG
                          className="h-3 w-3 fill-red-500"
                        />
                        No-show
                      </span>
                    ) : (
                      <>
                        <Button
                          onClick={() => handleMarkNoShow(rsvp.id)}
                          disabled={markingId === rsvp.id}
                          size="sm"
                          variant="danger"
                        >
                          <WarningSVG
                            className="size-4"
                          />
                          {markingId === rsvp.id ? 'Marking...' : 'No-show'}
                        </Button>
                        <Button
                          onClick={() => handleMarkAttended(rsvp.id)}
                          disabled={markingId === rsvp.id}
                          size="sm"
                          className="rounded-full border-green-500/30 text-green-600 hover:border-green-500 hover:bg-green-500/10"
                        >
                          <CheckCircleSVG
                            className="size-4"
                          />
                          {markingId === rsvp.id ? 'Marking...' : 'Mark attended'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Container>
      </div>
    </PageContainer>
  );
}
