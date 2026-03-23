import { createPublicClient } from '@/utils/supabase/server';
import type { SceneEventInterested } from '@/lib/data/scene';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const ids = request.nextUrl.searchParams.get('ids');

  if (!ids) {
    return NextResponse.json(
      { error: 'Missing ids parameter' },
      { status: 400 },
    );
  }

  const eventIds = ids.split(',').filter(Boolean);

  if (eventIds.length === 0) {
    return NextResponse.json({ interestedByEvent: {} });
  }

  if (eventIds.length > 50) {
    return NextResponse.json(
      { error: 'Too many IDs (max 50)' },
      { status: 400 },
    );
  }

  const supabase = createPublicClient();

  const { data: rows } = await supabase
    .from('scene_event_interests')
    .select(
      `
      scene_event_id,
      user_id,
      profile:profiles!scene_event_interests_user_id_fkey(avatar_url, full_name, nickname, suspended_at, deletion_scheduled_at)
    `,
    )
    .in('scene_event_id', eventIds)
    .order('created_at', { ascending: false })
    .limit(500);

  const active = (rows || []).filter((r) => {
    const p = r.profile as {
      suspended_at?: string | null;
      deletion_scheduled_at?: string | null;
    } | null;
    return !p?.suspended_at && !p?.deletion_scheduled_at;
  });

  const byEvent = active.reduce((acc, row) => {
    const id = row.scene_event_id;
    if (!acc[id]) acc[id] = [];
    acc[id].push({
      user_id: row.user_id,
      profile: row.profile
        ? {
          avatar_url: (row.profile as { avatar_url: string | null }).avatar_url,
          full_name: (row.profile as { full_name: string | null }).full_name,
          nickname: (row.profile as { nickname: string | null }).nickname,
        }
        : null,
    });
    return acc;
  }, {} as Record<string, SceneEventInterested[]>);

  return NextResponse.json({ interestedByEvent: byEvent });
}
