import type { CPGEvent, EventAttendee } from '@/types/events';
import { getServerNow } from '@/lib/cache/serverNow';
import { filterPastEvents, filterUpcomingEvents } from '@/lib/events/filters';
import { createAdminClient } from '@/utils/supabase/admin';
import { createPublicClient } from '@/utils/supabase/server';
import { cacheLife, cacheTag } from 'next/cache';

const EVENT_LIST_COLUMNS =
  'id, title, description, date, location, time, cover_image, created_at, image_blurhash, image_height, image_width, max_attendees, rsvp_count, slug';

/**
 * Get all event slugs for static generation
 * Used in generateStaticParams to pre-render event pages
 * No caching needed - only called at build time
 */
export async function getAllEventSlugs() {
  const supabase = createPublicClient();

  const { data } = await supabase
    .from('events')
    .select('slug')
    .eq('is_draft', false)
    .not('slug', 'is', null);

  return (data || []).map((e) => e.slug).filter((s): s is string => s !== null);
}

/**
 * All published events, ordered by date ascending.
 * Date filtering happens in callers using fresh server time.
 */
export async function getPublishedEvents() {
  'use cache';
  cacheLife('tagged');
  cacheTag('events');

  const supabase = createPublicClient();
  const { data } = await supabase
    .from('events')
    .select(EVENT_LIST_COLUMNS)
    .eq('is_draft', false)
    .order('date', { ascending: true });

  return (data || []) as CPGEvent[];
}

/**
 * Get recent events for homepage
 * Tagged with 'events' for granular cache invalidation
 */
export async function getRecentEvents(limit = 6) {
  const events = await getPublishedEvents();
  const recent = [...events]
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .slice(0, limit);

  const eventIds = recent.map((e) => e.id);
  const attendeesByEvent = eventIds.length > 0
    ? await getEventAttendees(eventIds)
    : {} as Record<number, EventAttendee[]>;

  return {
    events: recent,
    attendeesByEvent,
  };
}

/**
 * Get upcoming events (date >= today)
 * Tagged with 'events' for granular cache invalidation
 */
export async function getUpcomingEvents(limit?: number) {
  const serverNow = await getServerNow();
  const upcoming = filterUpcomingEvents(await getPublishedEvents(), serverNow);
  const events = limit ? upcoming.slice(0, limit) : upcoming;

  return {
    events,
    serverNow,
  };
}

/**
 * Get past events with pagination
 * Tagged with 'events' for granular cache invalidation
 */
export async function getPastEvents(limit = 5) {
  const serverNow = await getServerNow();
  const past = filterPastEvents(await getPublishedEvents(), serverNow);

  return {
    events: past.slice(0, limit),
    totalCount: past.length,
    serverNow,
  };
}

/**
 * Get a single event by slug
 * Tagged with 'events' for granular cache invalidation
 */
export async function getEventBySlug(slug: string) {
  'use cache';
  cacheLife('tagged');
  cacheTag('events');
  cacheTag(`event-${slug}`);

  const supabase = createPublicClient();

  const { data: event } = await supabase
    .from('events')
    .select(EVENT_LIST_COLUMNS)
    .eq('is_draft', false)
    .eq('slug', slug)
    .single();

  return {
    event: event as CPGEvent | null,
  };
}

/**
 * Get attendees for a single event
 * Tagged with 'event-attendees' for granular cache invalidation on RSVP changes
 */
export async function getEventAttendeesForEvent(eventId: number) {
  'use cache';
  cacheLife('tagged');
  cacheTag('event-attendees');

  const supabase = createAdminClient();

  const { data: attendees } = await supabase
    .from('events_rsvps')
    .select('id, user_id, confirmed_at, profiles (avatar_url, full_name, nickname, suspended_at, deletion_scheduled_at)')
    .eq('event_id', eventId)
    .not('confirmed_at', 'is', null)
    .is('canceled_at', null)
    .order('confirmed_at', { ascending: true })
    .limit(100);

  // Filter out attendees whose profiles are suspended or pending deletion
  return (attendees || []).filter((a) => {
    const p = a.profiles as { suspended_at?: string | null; deletion_scheduled_at?: string | null } | null;
    return !p?.suspended_at && !p?.deletion_scheduled_at;
  }).map((attendee) => ({
    id: attendee.id,
    user_id: attendee.user_id,
    email: null,
    confirmed_at: attendee.confirmed_at,
    profiles: attendee.profiles as EventAttendee['profiles'],
  }));
}

/**
 * Get attendees for a list of events
 * Tagged with 'event-attendees' for granular cache invalidation on RSVP changes
 */
export async function getEventAttendees(eventIds: number[]) {
  'use cache';
  cacheLife('tagged');
  cacheTag('event-attendees');

  if (eventIds.length === 0) {
    return {} as Record<number, EventAttendee[]>;
  }

  const supabase = createAdminClient();

  const { data: allAttendees } = await supabase
    .from('events_rsvps')
    .select(`
      id,
      event_id,
      user_id,
      confirmed_at,
      profiles (avatar_url, full_name, nickname, suspended_at, deletion_scheduled_at)
    `)
    .in('event_id', eventIds)
    .not('confirmed_at', 'is', null)
    .is('canceled_at', null)
    .order('confirmed_at', { ascending: true })
    .limit(500);

  // Filter out attendees whose profiles are suspended or pending deletion
  const activeAttendees = (allAttendees || []).filter((a) => {
    const p = a.profiles as { suspended_at?: string | null; deletion_scheduled_at?: string | null } | null;
    return !p?.suspended_at && !p?.deletion_scheduled_at;
  });

  // Group attendees by event
  const attendeesByEvent = activeAttendees.reduce((acc, attendee) => {
    const eventId = attendee.event_id;
    if (eventId === null) return acc;
    if (!acc[eventId]) acc[eventId] = [];
    acc[eventId].push({
      id: String(attendee.id),
      event_id: eventId,
      user_id: attendee.user_id,
      email: '',
      confirmed_at: attendee.confirmed_at || '',
      profiles: attendee.profiles,
    });
    return acc;
  }, {} as Record<number, EventAttendee[]>);

  return attendeesByEvent;
}
