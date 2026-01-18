import { cacheTag, cacheLife } from 'next/cache';
import { createPublicClient } from '@/utils/supabase/server';
import type { CPGEvent, EventAttendee } from '@/types/events';

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
    .not('slug', 'is', null);

  return (data || []).map((e) => e.slug).filter((s): s is string => s !== null);
}

/**
 * Get recent events for homepage
 * Tagged with 'events' for granular cache invalidation
 * Returns events with a server timestamp for date comparisons
 */
export async function getRecentEvents(limit = 6) {
  'use cache';
  cacheLife('max');
  cacheTag('events');

  const supabase = createPublicClient();
  const { data } = await supabase
    .from('events')
    .select('id, title, date, location, time, cover_image, image_url, slug, description')
    .order('date', { ascending: false })
    .limit(limit);

  return {
    events: (data || []) as CPGEvent[],
    serverNow: Date.now(),
  };
}

/**
 * Get upcoming events (date >= today)
 * Tagged with 'events' for granular cache invalidation
 * Returns events with a server timestamp for date comparisons
 */
export async function getUpcomingEvents() {
  'use cache';
  cacheLife('max');
  cacheTag('events');

  const supabase = createPublicClient();
  const serverNow = Date.now();
  const nowDate = new Date(serverNow).toISOString().split('T')[0];

  const { data } = await supabase
    .from('events')
    .select('id, title, description, date, location, time, cover_image, created_at, image_blurhash, image_height, image_url, image_width, max_attendees, rsvp_count, slug')
    .gte('date', nowDate)
    .order('date', { ascending: true });

  return {
    events: (data || []) as CPGEvent[],
    serverNow,
  };
}

/**
 * Get past events with pagination
 * Tagged with 'events' for granular cache invalidation
 * Returns events with a server timestamp for date comparisons
 */
export async function getPastEvents(limit = 5) {
  'use cache';
  cacheLife('max');
  cacheTag('events');

  const supabase = createPublicClient();
  const serverNow = Date.now();
  const nowDate = new Date(serverNow).toISOString().split('T')[0];

  const { data, count } = await supabase
    .from('events')
    .select('id, title, description, date, location, time, cover_image, created_at, image_blurhash, image_height, image_url, image_width, max_attendees, rsvp_count, slug', { count: 'exact' })
    .lt('date', nowDate)
    .order('date', { ascending: false })
    .limit(limit);

  return {
    events: (data || []) as CPGEvent[],
    totalCount: count || 0,
    serverNow,
  };
}

/**
 * Get a single event by slug
 * Tagged with 'events' for granular cache invalidation
 * Returns event with a server timestamp for date comparisons
 */
export async function getEventBySlug(slug: string) {
  'use cache';
  cacheLife('max');
  cacheTag('events');

  const supabase = createPublicClient();

  const { data: event } = await supabase
    .from('events')
    .select('id, title, description, date, location, time, cover_image, created_at, image_blurhash, image_height, image_url, image_width, max_attendees, rsvp_count, slug')
    .eq('slug', slug)
    .single();

  return {
    event: event as CPGEvent | null,
    serverNow: Date.now(),
  };
}

/**
 * Get attendees for a single event
 * Tagged with 'event-attendees' for granular cache invalidation on RSVP changes
 */
export async function getEventAttendeesForEvent(eventId: number) {
  'use cache';
  cacheLife('max');
  cacheTag('event-attendees');

  const supabase = createPublicClient();

  const { data: attendees } = await supabase
    .from('events_rsvps')
    .select('id, user_id, email, confirmed_at, profiles (avatar_url)')
    .eq('event_id', eventId)
    .not('confirmed_at', 'is', null)
    .is('canceled_at', null)
    .order('confirmed_at', { ascending: true })
    .limit(100);

  return attendees || [];
}

/**
 * Get attendees for a list of events
 * Tagged with 'event-attendees' for granular cache invalidation on RSVP changes
 */
export async function getEventAttendees(eventIds: number[]) {
  'use cache';
  cacheLife('max');
  cacheTag('event-attendees');

  if (eventIds.length === 0) {
    return {} as Record<number, EventAttendee[]>;
  }

  const supabase = createPublicClient();

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
    .in('event_id', eventIds)
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

  return attendeesByEvent;
}
