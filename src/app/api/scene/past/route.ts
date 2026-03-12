import {
  getSceneEventInterests,
  type SceneEventInterested,
} from '@/lib/data/scene';
import type { SceneEvent } from '@/types/scene';
import { createPublicClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  if (offset < 0 || limit < 1 || limit > 50) {
    return NextResponse.json(
      { error: 'Invalid offset or limit' },
      { status: 400 },
    );
  }

  const supabase = createPublicClient();
  const now = new Date().toISOString().split('T')[0];

  const { data: events, error } = await supabase
    .from('scene_events')
    .select(
      'id, slug, title, description, category, start_date, end_date, start_time, end_time, location_name, location_city, location_address, url, cover_image_url, image_blurhash, image_width, image_height, organizer, price_info, submitted_by, interest_count, created_at',
    )
    .is('deleted_at', null)
    .or(`end_date.lt.${now},and(end_date.is.null,start_date.lt.${now})`)
    .order('start_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching past scene events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 },
    );
  }

  const eventList = (events || []) as SceneEvent[];
  const eventIds = eventList.map((e) => e.id);
  const interestedByEvent: Record<string, SceneEventInterested[]> =
    eventIds.length > 0
      ? await getSceneEventInterests(eventIds)
      : {};

  return NextResponse.json({
    events: eventList,
    interestedByEvent,
  });
}
