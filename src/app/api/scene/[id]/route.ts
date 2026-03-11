import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { revalidateScene, revalidateSceneEvent } from '@/app/actions/revalidate';
import { downloadAndUploadOgImage } from '@/lib/og';
import {
  SCENE_EVENT_CATEGORIES,
  type SceneEventCategory,
} from '@/types/scene';

const VALID_CATEGORIES = SCENE_EVENT_CATEGORIES.map((c) => c.value);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to edit an event' },
        { status: 401 },
      );
    }

    // Check if user is owner or admin
    const { data: event } = await supabase
      .from('scene_events')
      .select('id, slug, submitted_by, deleted_at')
      .eq('id', id)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.deleted_at) {
      return NextResponse.json(
        { error: 'Cannot edit a deleted event' },
        { status: 400 },
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    const isOwner = user.id === event.submitted_by;
    const isAdmin = !!profile?.is_admin;

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Only the event submitter or an admin can edit' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      title,
      category,
      start_date,
      end_date,
      start_time,
      end_time,
      location_name,
      location_city,
      location_address,
      url,
      description,
      organizer,
      price_info,
    } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 },
      );
    }
    if (title.trim().length > 200) {
      return NextResponse.json(
        { error: 'Title is too long (max 200 characters)' },
        { status: 400 },
      );
    }
    if (!category || !VALID_CATEGORIES.includes(category as SceneEventCategory)) {
      return NextResponse.json(
        { error: 'Valid category is required' },
        { status: 400 },
      );
    }
    if (!start_date || typeof start_date !== 'string') {
      return NextResponse.json(
        { error: 'Start date is required' },
        { status: 400 },
      );
    }
    if (
      !location_name ||
      typeof location_name !== 'string' ||
      location_name.trim().length === 0
    ) {
      return NextResponse.json(
        { error: 'Venue name is required' },
        { status: 400 },
      );
    }
    if (
      !location_city ||
      typeof location_city !== 'string' ||
      location_city.trim().length === 0
    ) {
      return NextResponse.json(
        { error: 'City is required' },
        { status: 400 },
      );
    }
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return NextResponse.json(
        { error: 'Event page URL is required' },
        { status: 400 },
      );
    }

    const ogResult = await downloadAndUploadOgImage(id, url.trim());

    const updatePayload = {
      title: title.trim(),
      description: description?.trim() || null,
      category: category as SceneEventCategory,
      start_date,
      end_date: end_date?.trim() || null,
      start_time: start_time?.trim() || null,
      end_time: end_time?.trim() || null,
      location_name: location_name.trim(),
      location_city: location_city.trim(),
      location_address: location_address?.trim() || null,
      url: url.trim(),
      cover_image_url: ogResult?.publicUrl ?? null,
      ...(ogResult?.imageBlurhash != null && {
        image_blurhash: ogResult.imageBlurhash,
      }),
      ...(ogResult?.imageWidth != null &&
        ogResult?.imageHeight != null && {
        image_width: ogResult.imageWidth,
        image_height: ogResult.imageHeight,
      }),
      organizer: organizer?.trim() || null,
      price_info: price_info?.trim() || null,
    };

    const { data: updated, error } = await supabase
      .from('scene_events')
      .update(updatePayload)
      .eq('id', id)
      .select('id, slug, title, created_at')
      .single();

    if (error) {
      console.error('Scene event update error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update event' },
        { status: 500 },
      );
    }

    await revalidateScene();
    await revalidateSceneEvent(event.slug);

    return NextResponse.json({ event: updated });
  } catch (err) {
    console.error('Scene update error:', err);
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 },
    );
  }
}
