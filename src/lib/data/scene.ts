import { getServerNow } from '@/lib/cache/serverNow';
import {
    filterPastSceneEvents,
    filterRelatedSceneEvents,
    filterUpcomingSceneEvents,
} from '@/lib/scene/filters';
import type { SceneEvent } from '@/types/scene';
import { createPublicClient } from '@/utils/supabase/server';
import { cacheLife, cacheTag } from 'next/cache';

const SCENE_LIST_COLUMNS =
  'id, slug, title, description, category, start_date, end_date, start_time, end_time, location_name, location_city, location_address, url, cover_image_url, image_blurhash, image_width, image_height, organizer, price_info, submitted_by, interest_count, created_at';

/**
 * Get all scene event slugs for static generation.
 * Cached because Next.js Cache Components also runs generateStaticParams
 * at request time (not only at build).
 */
export async function getAllSceneEventSlugs() {
  'use cache';
  cacheLife('tagged');
  cacheTag('scene');

  const supabase = createPublicClient();

  const { data } = await supabase
    .from('scene_events')
    .select('slug')
    .is('deleted_at', null);

  return (data || []).map((e) => e.slug);
}

/**
 * All non-deleted scene events. Date filtering uses fresh server time in callers.
 */
export async function getPublishedSceneEvents() {
  'use cache';
  cacheLife('tagged');
  cacheTag('scene');

  const supabase = createPublicClient();

  const { data } = await supabase
    .from('scene_events')
    .select(SCENE_LIST_COLUMNS)
    .is('deleted_at', null)
    .order('start_date', { ascending: true });

  return (data || []) as SceneEvent[];
}

/**
 * Get upcoming scene events (start_date >= today or end_date >= today for multi-day)
 * Tagged with 'scene' for granular cache invalidation
 */
export async function getUpcomingSceneEvents() {
  const serverNow = await getServerNow();
  const events = filterUpcomingSceneEvents(await getPublishedSceneEvents(), serverNow);

  return {
    events,
    serverNow,
  };
}

/**
 * Get past scene events with pagination (end_date < today; events that have ended)
 * Ongoing events (started but not ended) are excluded - they belong in the Ongoing tab.
 * Tagged with 'scene' for granular cache invalidation
 */
export async function getPastSceneEvents(limit = 5) {
  const serverNow = await getServerNow();
  const past = filterPastSceneEvents(await getPublishedSceneEvents(), serverNow);

  return {
    events: past.slice(0, limit),
    totalCount: past.length,
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

const SCENE_EVENT_DETAIL_SELECT = `
  id, slug, title, description, category, start_date, end_date, start_time, end_time,
  location_name, location_city, location_address, url, cover_image_url,
  image_blurhash, image_width, image_height, organizer, price_info,
  submitted_by, interest_count, created_at,
  submitter:profiles!scene_events_submitted_by_fkey(nickname, full_name, avatar_url)
`;

/**
 * Direct slug read. Query failures throw so `'use cache'` does not store them
 * as a successful miss — a stored miss stays a 404 for the tagged lifetime.
 */
async function getCachedSceneEventBySlug(slug: string) {
  'use cache';
  cacheLife('tagged');
  cacheTag('scene');
  cacheTag(`scene-${slug}`);

  const supabase = createPublicClient();

  const { data: row, error } = await supabase
    .from('scene_events')
    .select(SCENE_EVENT_DETAIL_SELECT)
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(`Scene event lookup failed for ${slug}: ${error.message}`);
  }

  if (!row) {
    return { event: null };
  }

  const { submitter, ...event } = row as unknown as SceneEventWithSubmitter;
  return {
    event: { ...event, submitter } as SceneEventWithSubmitter,
  };
}

function isAbandonedPrerenderLookup(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const digest = (error as Error & { digest?: string }).digest;
  return (
    error.name === 'AbortError'
    || error.message.includes('aborted')
    // `stale: 0` caches are dynamic holes. When the prerender finishes first,
    // Next rejects the in-flight read with this digest. React normally swallows
    // it; this wrapper observes it, so handle it here and use the list fallback.
    || digest === 'HANGING_PROMISE_REJECTION'
  );
}

/**
 * Get a single scene event by slug with submitter profile.
 * Falls back to the published list when the per-slug cache missed or the
 * direct read failed. Prerender aborts that lookup under load; storing the
 * abort as an empty result was serving 404s for events still listed on /scene.
 */
export async function getSceneEventBySlug(slug: string) {
  try {
    const cached = await getCachedSceneEventBySlug(slug);
    if (cached.event) return cached;
  } catch (error) {
    if (!isAbandonedPrerenderLookup(error)) {
      console.error(`Scene event lookup failed for ${slug}:`, error);
    }
  }

  const listed = (await getPublishedSceneEvents()).find((event) => event.slug === slug);
  if (!listed) {
    return { event: null };
  }

  return {
    event: { ...listed, submitter: null },
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
  const [allEvents, serverNow] = await Promise.all([
    getPublishedSceneEvents(),
    getServerNow(),
  ]);
  return filterRelatedSceneEvents(
    allEvents as Array<SceneEvent & { id: string; location_city: string; category: string }>,
    excludeId,
    city,
    category,
    limit,
    serverNow,
  ) as Pick<
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
  cacheLife('tagged');
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
