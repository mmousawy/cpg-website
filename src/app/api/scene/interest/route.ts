import { NextRequest, NextResponse } from 'next/server';

import { revalidateScene } from '@/app/actions/revalidate';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { sceneEventId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const sceneEventId = body.sceneEventId;
  if (typeof sceneEventId !== 'string' || !sceneEventId) {
    return NextResponse.json(
      { error: 'sceneEventId is required' },
      { status: 400 },
    );
  }

  // Verify scene event exists and is not deleted
  const { data: sceneEvent, error: fetchError } = await supabase
    .from('scene_events')
    .select('id')
    .eq('id', sceneEventId)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchError || !sceneEvent) {
    return NextResponse.json(
      { error: 'Scene event not found' },
      { status: 404 },
    );
  }

  const { data: existing } = await supabase
    .from('scene_event_interests')
    .select('scene_event_id')
    .eq('scene_event_id', sceneEventId)
    .eq('user_id', user.id)
    .maybeSingle();

  const isCurrentlyInterested = !!existing;

  if (isCurrentlyInterested) {
    const { error: deleteError } = await supabase
      .from('scene_event_interests')
      .delete()
      .eq('scene_event_id', sceneEventId)
      .eq('user_id', user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || 'Failed to remove interest' },
        { status: 500 },
      );
    }
  } else {
    const { error: insertError } = await supabase
      .from('scene_event_interests')
      .insert({ scene_event_id: sceneEventId, user_id: user.id });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message || 'Failed to add interest' },
        { status: 500 },
      );
    }
  }

  const { data: updated } = await supabase
    .from('scene_events')
    .select('interest_count')
    .eq('id', sceneEventId)
    .single();

  await revalidateScene();

  return NextResponse.json({
    interested: !isCurrentlyInterested,
    count: updated?.interest_count ?? 0,
  });
}
