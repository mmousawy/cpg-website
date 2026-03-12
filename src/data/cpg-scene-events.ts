import type { SceneEvent } from '@/types/scene';

/**
 * CPG's own events — not in the database, rendered inline with community events.
 * Use ids prefixed with "cpg-" so cards can link externally when url is set.
 */
export type CpgSceneEventInput = {
  id: string;
  slug: string;
  title: string;
  category: SceneEvent['category'];
  start_date: string;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location_name: string;
  location_city: string;
  location_address?: string | null;
  url: string | null;
  cover_image_url?: string | null;
  image_blurhash?: string | null;
  organizer?: string | null;
  price_info?: string | null;
  description?: string | null;
};

/** Convert to SceneEvent shape for rendering. */
function toSceneEvent(e: CpgSceneEventInput): SceneEvent {
  return {
    ...e,
    end_date: e.end_date ?? null,
    start_time: e.start_time ?? null,
    end_time: e.end_time ?? null,
    location_address: e.location_address ?? null,
    cover_image_url: e.cover_image_url ?? null,
    image_blurhash: e.image_blurhash ?? null,
    image_width: null,
    image_height: null,
    organizer: e.organizer ?? null,
    price_info: e.price_info ?? null,
    description: e.description ?? null,
    submitted_by: '00000000-0000-0000-0000-000000000000',
    interest_count: 0,
    created_at: new Date().toISOString(),
    deleted_at: null,
    updated_at: new Date().toISOString(),
  } as SceneEvent;
}

const CPG_EVENTS: CpgSceneEventInput[] = [
  // Add your meetups here. Use ids prefixed with "cpg-", future dates, and set url for external links.
];

export const CPG_SCENE_EVENTS: SceneEvent[] = CPG_EVENTS.map(toSceneEvent);

/** CPG events that are upcoming (start_date >= today or end_date >= today). */
export function getCpgUpcomingSceneEvents(nowDate: string): SceneEvent[] {
  const result = CPG_SCENE_EVENTS.filter((e) => {
    if (e.start_date >= nowDate) return true;
    return e.end_date != null && e.end_date >= nowDate;
  });
  console.log('[CPG Scene] getCpgUpcomingSceneEvents:', {
    nowDate,
    totalCpgEvents: CPG_SCENE_EVENTS.length,
    upcomingCount: result.length,
    events: CPG_SCENE_EVENTS.map((e) => ({ id: e.id, title: e.title, start_date: e.start_date })),
  });
  return result;
}

/** CPG events that are past (ended before today). */
export function getCpgPastSceneEvents(nowDate: string): SceneEvent[] {
  const result = CPG_SCENE_EVENTS.filter((e) => {
    const end = e.end_date ?? e.start_date;
    return end < nowDate;
  });
  console.log('[CPG Scene] getCpgPastSceneEvents:', {
    nowDate,
    pastCount: result.length,
  });
  return result;
}

/** Merge and sort: community + CPG events by start_date ascending. */
export function mergeUpcomingWithCpg(
  dbEvents: SceneEvent[],
  cpgEvents: SceneEvent[],
): SceneEvent[] {
  const merged = [...dbEvents, ...cpgEvents];
  merged.sort((a, b) => a.start_date.localeCompare(b.start_date));
  return merged;
}

/** Merge past: CPG first (most recent), then DB events. */
export function mergePastWithCpg(
  dbEvents: SceneEvent[],
  cpgEvents: SceneEvent[],
): SceneEvent[] {
  const byDate = (e: SceneEvent) => e.end_date ?? e.start_date;
  const sorted = [...cpgEvents].sort(
    (a, b) => byDate(b).localeCompare(byDate(a)),
  );
  return [...sorted, ...dbEvents];
}
