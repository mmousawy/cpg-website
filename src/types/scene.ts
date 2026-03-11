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

/** Unique colors for each category (active state: border, bg, text) */
export const SCENE_CATEGORY_COLORS: Record<SceneEventCategory | 'all', string> = {
  all: '#475569',
  exhibition: '#b45309',
  photowalk: '#0e7490',
  talk: '#6d28d9',
  workshop: '#059669',
  festival: '#c026d3',
  meetup: '#2563eb',
  other: '#64748b',
};

/** Uses CSS variables so colors adapt to light/dark/midnight themes. */
export function getSceneCategoryStyle(
  category: SceneEventCategory | 'all' | string,
) {
  const key = (SCENE_EVENT_CATEGORIES.some((c) => c.value === category) ||
    category === 'all')
    ? (category as SceneEventCategory | 'all')
    : 'other';
  const varName = `--category-${key}`;
  return {
    borderColor: `var(${varName})`,
    backgroundColor: `color-mix(in srgb, var(${varName}) 12%, transparent)`,
    color: `var(${varName})`,
  } as const;
}

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
