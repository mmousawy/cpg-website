import type { CPGEvent } from '@/types/events';
import type { SceneEvent } from '@/types/scene';

/**
 * Convert a CPG Event (from the events table) to SceneEvent format
 * so it can be rendered on the Scene page. Uses id prefix "cpg-event-" so
 * the card links to /events/[slug].
 */
export function cpgEventToSceneEvent(e: CPGEvent): SceneEvent {
  const location = e.location?.trim() ?? '';
  return {
    id: `cpg-event-${e.id}`,
    slug: e.slug,
    title: e.title ?? 'Meetup',
    category: 'meetup',
    start_date: e.date ?? '',
    end_date: null,
    start_time: e.time,
    end_time: null,
    location_name: location,
    location_city: location || 'Netherlands',
    location_address: null,
    url: null,
    cover_image_url: e.cover_image,
    image_blurhash: e.image_blurhash,
    image_width: e.image_width,
    image_height: e.image_height,
    organizer: 'CPG',
    price_info: null,
    submitted_by: '00000000-0000-0000-0000-000000000000',
    interest_count: e.rsvp_count ?? 0,
    created_at: e.created_at ?? new Date().toISOString(),
    deleted_at: null,
    updated_at: new Date().toISOString(),
    description: e.description,
  } as SceneEvent;
}
