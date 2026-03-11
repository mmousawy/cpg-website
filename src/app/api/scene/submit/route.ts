import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { revalidateScene, revalidateSceneEvent } from '@/app/actions/revalidate';
import { downloadAndUploadOgImage } from '@/lib/og';
import {
  SCENE_EVENT_CATEGORIES,
  type SceneEventCategory,
} from '@/types/scene';

const VALID_CATEGORIES = SCENE_EVENT_CATEGORIES.map((c) => c.value);
const RATE_LIMIT_PER_DAY = 5;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateSlug(title: string, startDate: string): string {
  const base = slugify(title);
  const datePart = startDate.replace(/-/g, '');
  return `${base}-${datePart}`;
}

function randomSuffix(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to add an event' },
        { status: 401 },
      );
    }

    const userId = user.id;

    // Rate limit: max 5 per day (admins bypass)
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    const isAdmin = !!profile?.is_admin;

    if (!isAdmin) {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      const { count } = await supabase
        .from('scene_events')
        .select('*', { count: 'exact', head: true })
        .eq('submitted_by', userId)
        .gte('created_at', oneDayAgo.toISOString());

      if ((count ?? 0) >= RATE_LIMIT_PER_DAY) {
        return NextResponse.json(
          {
            error: `You can add at most ${RATE_LIMIT_PER_DAY} events per day. Try again tomorrow.`,
          },
          { status: 429 },
        );
      }
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

    // Validate required fields
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
    if (!location_name || typeof location_name !== 'string' || location_name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Location name is required' },
        { status: 400 },
      );
    }
    if (!location_city || typeof location_city !== 'string' || location_city.trim().length === 0) {
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

    // Duplicate check (soft - we'll return a warning)
    const { data: existing } = await supabase
      .from('scene_events')
      .select('slug')
      .ilike('title', title.trim())
      .eq('start_date', start_date)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();

    let duplicateWarning = false;
    let existingSlug: string | undefined;
    if (existing) {
      duplicateWarning = true;
      existingSlug = existing.slug;
    }

    // Generate slug with collision handling
    let slug = generateSlug(title.trim(), start_date);
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const { data: inserted, error } = await supabase
        .from('scene_events')
        .insert({
          slug,
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
          cover_image_url: null,
          organizer: organizer?.trim() || null,
          price_info: price_info?.trim() || null,
          submitted_by: userId,
        })
        .select('id, slug, title, created_at')
        .single();

      if (!error) {
        const ogResult = await downloadAndUploadOgImage(inserted.id, url.trim());
        if (ogResult) {
          await supabase
            .from('scene_events')
            .update({
              cover_image_url: ogResult.publicUrl,
              ...(ogResult.imageBlurhash != null && {
                image_blurhash: ogResult.imageBlurhash,
              }),
              ...(ogResult.imageWidth != null &&
                ogResult.imageHeight != null && {
                image_width: ogResult.imageWidth,
                image_height: ogResult.imageHeight,
              }),
            })
            .eq('id', inserted.id);
        }
        await revalidateScene();
        await revalidateSceneEvent(inserted.slug);

        return NextResponse.json({
          event: inserted,
          duplicate_warning: duplicateWarning,
          existing_slug: existingSlug,
        });
      }

      if (error.code === '23505') {
        slug = `${generateSlug(title.trim(), start_date)}-${randomSuffix()}`;
        attempts++;
      } else {
        console.error('Scene event insert error:', error);
        return NextResponse.json(
          { error: error.message || 'Failed to add event' },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      { error: 'Could not generate unique slug. Please try again.' },
      { status: 500 },
    );
  } catch (err) {
    console.error('Scene submit error:', err);
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 },
    );
  }
}
