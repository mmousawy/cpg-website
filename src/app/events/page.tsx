import { createPublicClient } from '@/utils/supabase/server';
import PageContainer from '@/components/layout/PageContainer';
import EventsList from '@/components/events/EventsList';
import PastEventsPaginated from '@/components/events/PastEventsPaginated';
import type { CPGEvent, EventAttendee } from '@/types/events';

const PAST_EVENTS_PER_PAGE = 10;

export default async function EventsPage() {
  const supabase = createPublicClient();
  const now = new Date().toISOString().split('T')[0];

  // Fetch upcoming and past events in parallel
  const [
    { data: upcomingEvents },
    { data: pastEvents, count: pastEventsCount },
  ] = await Promise.all([
    // All upcoming events (usually few)
    supabase
      .from('events')
      .select('id, title, description, date, location, time, cover_image, created_at, image_blurhash, image_height, image_url, image_width, max_attendees, rsvp_count, slug')
      .gte('date', now)
      .order('date', { ascending: true }),
    // First page of past events with total count
    supabase
      .from('events')
      .select('id, title, description, date, location, time, cover_image, created_at, image_blurhash, image_height, image_url, image_width, max_attendees, rsvp_count, slug', { count: 'exact' })
      .lt('date', now)
      .order('date', { ascending: false })
      .limit(PAST_EVENTS_PER_PAGE),
  ]);

  const allUpcoming = (upcomingEvents || []) as CPGEvent[];
  const initialPast = (pastEvents || []) as CPGEvent[];

  // Fetch attendees for all displayed events
  const displayedEventIds = [
    ...allUpcoming.map(e => e.id),
    ...initialPast.map(e => e.id),
  ];

  const { data: allAttendees } = await supabase
    .from('events_rsvps')
    .select(`
      id,
      event_id,
      user_id,
      email,
      confirmed_at,
      profiles (avatar_url)
    `)
    .in('event_id', displayedEventIds)
    .not('confirmed_at', 'is', null)
    .is('canceled_at', null)
    .order('confirmed_at', { ascending: true })
    .limit(500);

  // Group attendees by event
  const attendeesByEvent = (allAttendees || []).reduce((acc, attendee) => {
    const eventId = attendee.event_id;
    if (eventId === null) return acc;
    if (!acc[eventId]) acc[eventId] = [];
    acc[eventId].push({
      id: String(attendee.id),
      event_id: eventId,
      user_id: attendee.user_id,
      email: attendee.email || '',
      confirmed_at: attendee.confirmed_at || '',
      profiles: attendee.profiles,
    });
    return acc;
  }, {} as Record<number, EventAttendee[]>);

  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Events</h1>
        <p className="mt-2 text-foreground/70">
          Join us at our upcoming meetups or browse past events
        </p>
      </div>

      <div className="space-y-10">
        {/* Upcoming Events */}
        <section>
          <h2 className="text-lg font-semibold mb-4 opacity-70">Upcoming</h2>
          <div className="grid gap-4 sm:gap-6">
            <EventsList
              events={allUpcoming}
              attendeesByEvent={attendeesByEvent}
              emptyMessage="No upcoming events scheduled. Check back soon!"
            />
          </div>
        </section>

        {/* Past Events - Paginated */}
        <section>
          <h2 className="text-lg font-semibold mb-4 opacity-70">Past events</h2>
          <div className="grid gap-4 sm:gap-6">
            <PastEventsPaginated
              initialEvents={initialPast}
              initialAttendees={attendeesByEvent}
              totalCount={pastEventsCount || 0}
              perPage={PAST_EVENTS_PER_PAGE}
            />
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
