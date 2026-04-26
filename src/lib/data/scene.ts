import type { SceneEvent } from '@/types/scene';
import { getAmsterdamDateString } from '@/lib/events/status';
import { createPublicClient } from '@/utils/supabase/server';
import { cacheLife, cacheTag } from 'next/cache';

/**
 * Get all scene event slugs for static generation
 * Used in generateStaticParams to pre-render scene event pages
 */
export async function getAllSceneEventSlugs() {
  const supabase = createPublicClient();

  const { data } = await supabase
    .from('scene_events')
    .select('slug')
    .is('deleted_at', null);

  return (data || []).map((e) => e.slug);
}

/**
 * Get upcoming scene events (start_date >= today or end_date >= today for multi-day)
 * Tagged with 'scene' for granular cache invalidation
 */
export async function getUpcomingSceneEvents() {
  'use cache';
  cacheLife('max');
  cacheTag('scene');

  const supabase = createPublicClient();
  const serverNow = Date.now();
  const nowDate = getAmsterdamDateString(serverNow);

  const { data } = await supabase
    .from('scene_events')
    .select(
      'id, slug, title, description, category, start_date, end_date, start_time, end_time, location_name, location_city, location_address, url, cover_image_url, image_blurhash, image_width, image_height, organizer, price_info, submitted_by, interest_count, created_at',
    )
    .is('deleted_at', null)
    .or(`start_date.gte.${nowDate},end_date.gte.${nowDate}`)
    .order('start_date', { ascending: true });

  return {
    events: (data || []) as SceneEvent[],
    serverNow,
  };
}

/**
 * Get past scene events with pagination (end_date < today; events that have ended)
 * Ongoing events (started but not ended) are excluded - they belong in the Ongoing tab.
 * Tagged with 'scene' for granular cache invalidation
 */
export async function getPastSceneEvents(limit = 5) {
  'use cache';
  cacheLife('max');
  cacheTag('scene');

  const supabase = createPublicClient();
  const serverNow = Date.now();
  const nowDate = getAmsterdamDateString(serverNow);

  const { data, count } = await supabase
    .from('scene_events')
    .select(
      'id, slug, title, description, category, start_date, end_date, start_time, end_time, location_name, location_city, location_address, url, cover_image_url, image_blurhash, image_width, image_height, organizer, price_info, submitted_by, interest_count, created_at',
      { count: 'exact' },
    )
    .is('deleted_at', null)
    .or(
      `end_date.lt.${nowDate},and(end_date.is.null,start_date.lt.${nowDate})`,
    )
    .order('start_date', { ascending: false })
    .limit(limit);

  return {
    events: (data || []) as SceneEvent[],
    totalCount: count || 0,
    serverNow,
  };
}

export type SceneEventWithSubmitter = SceneEvent & {
  submitter: {
    nickname: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

/**
 * Get a single scene event by slug with submitter profile
 */
export async function getSceneEventBySlug(slug: string) {
  'use cache';
  cacheLife('max');
  cacheTag('scene');
  cacheTag(`scene-${slug}`);

  const supabase = createPublicClient();

  const { data: row } = await supabase
    .from('scene_events')
    .select(
      `
      id, slug, title, description, category, start_date, end_date, start_time, end_time,
      location_name, location_city, location_address, url, cover_image_url,
      image_blurhash, image_width, image_height, organizer, price_info,
      submitted_by, interest_count, created_at,
      submitter:profiles!scene_events_submitted_by_fkey(nickname, full_name, avatar_url)
    `,
    )
    .eq('slug', slug)
    .is('deleted_at', null)
    .single();

  if (!row) {
    return { event: null, serverNow: Date.now() };
  }

  const { submitter, ...event } = row as unknown as SceneEventWithSubmitter;
  return {
    event: { ...event, submitter } as SceneEventWithSubmitter | null,
    serverNow: Date.now(),
  };
}

/**
 * Get related scene events (same city or category) for detail page
 */
export async function getRelatedSceneEvents(
  excludeId: string,
  city: string,
  category: string,
  limit = 10,
) {
  'use cache';
  cacheLife('max');
  cacheTag('scene');

  const supabase = createPublicClient();
  const serverNow = Date.now();
  const nowDate = getAmsterdamDateString(serverNow);

  const { data } = await supabase
    .from('scene_events')
    .select(
      'id, slug, title, category, start_date, end_date, start_time, end_time, location_name, location_city, url, cover_image_url, image_blurhash, image_width, image_height, organizer, price_info, interest_count',
    )
    .is('deleted_at', null)
    .neq('id', excludeId)
    .gte('start_date', nowDate)
    .or(`location_city.eq.${city},category.eq.${category}`)
    .order('start_date', { ascending: true })
    .limit(limit);

  return (data || []) as Pick<
    SceneEvent,
    | 'id'
    | 'slug'
    | 'title'
    | 'category'
    | 'start_date'
    | 'end_date'
    | 'start_time'
    | 'end_time'
    | 'location_name'
    | 'location_city'
    | 'url'
    | 'cover_image_url'
    | 'image_blurhash'
    | 'image_width'
    | 'image_height'
    | 'organizer'
    | 'price_info'
    | 'interest_count'
  >[];
}

export type SceneEventInterested = {
  user_id: string;
  profile: {
    avatar_url: string | null;
    full_name: string | null;
    nickname: string | null;
  } | null;
};

/**
 * Get interested users for a small batch of scene events.
 * Callers should pass at most ~50 IDs to avoid URI-too-large errors.
 * The scene overview page fetches interests lazily via /api/scene/interests.
 */
export async function getSceneEventInterests(
  sceneEventIds: string[],
): Promise<Record<string, SceneEventInterested[]>> {
  'use cache';
  cacheLife('max');
  cacheTag('scene');

  if (sceneEventIds.length === 0) {
    return {};
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
    .in('scene_event_id', sceneEventIds)
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

  return byEvent;
}
