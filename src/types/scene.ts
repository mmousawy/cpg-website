import type { Database } from '@/database.types';

export type SceneEvent = Omit<
  Database['public']['Tables']['scene_events']['Row'],
  'search_vector'
>;

export const SCENE_EVENT_CATEGORIES = [
  { value: 'exhibition', label: 'Exhibition' },
  { value: 'photowalk', label: 'Photowalk' },
  { value: 'talk', label: 'Talk' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'festival', label: 'Festival' },
  { value: 'meetup', label: 'Meetup' },
  { value: 'other', label: 'Other' },
] as const;

export type SceneEventCategory =
  (typeof SCENE_EVENT_CATEGORIES)[number]['value'];

export type SceneEventFormData = {
  title: string;
  category: SceneEventCategory;
  start_date: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  location_name: string;
  location_city: string;
  location_address?: string;
  url: string;
  description?: string;
  organizer?: string;
  price_info?: string;
};
