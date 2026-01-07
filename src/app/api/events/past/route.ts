import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient } from '@/utils/supabase/server';
import type { CPGEvent, EventAttendee } from '@/types/events';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  // Validate params
  if (offset < 0 || limit < 1 || limit > 50) {
    return NextResponse.json(
      { error: 'Invalid offset or limit' },
      { status: 400 },
    );
  }

  const supabase = createPublicClient();
  const now = new Date().toISOString().split('T')[0];

  // Fetch past events with pagination
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, description, date, location, time, cover_image, created_at, image_blurhash, image_height, image_url, image_width, max_attendees, rsvp_count, slug')
    .lt('date', now)
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching past events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 },
    );
  }

  const pastEvents = (events || []) as CPGEvent[];

  // Fetch attendees for these events
  const eventIds = pastEvents.map(e => e.id);

  const { data: attendees } = await supabase
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
  const attendeesByEvent = (attendees || []).reduce((acc, attendee) => {
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

  return NextResponse.json({
    events: pastEvents,
    attendeesByEvent,
  });
}
