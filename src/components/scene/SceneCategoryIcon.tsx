'use client';

import type { SceneEventCategory } from '@/types/scene';

import CategoryExhibitionSVG from 'public/icons/category-exhibition.svg';
import CategoryFestivalSVG from 'public/icons/category-festival.svg';
import CategoryMeetupSVG from 'public/icons/category-meetup.svg';
import CategoryOtherSVG from 'public/icons/category-other.svg';
import CategoryPhotowalkSVG from 'public/icons/category-photowalk.svg';
import CategoryTalkSVG from 'public/icons/category-talk.svg';
import CategoryWorkshopSVG from 'public/icons/category-workshop.svg';

const CATEGORY_ICONS: Record<SceneEventCategory, typeof CategoryExhibitionSVG> = {
  exhibition: CategoryExhibitionSVG,
  photowalk: CategoryPhotowalkSVG,
  talk: CategoryTalkSVG,
  workshop: CategoryWorkshopSVG,
  festival: CategoryFestivalSVG,
  meetup: CategoryMeetupSVG,
  other: CategoryOtherSVG,
};

type SceneCategoryIconProps = {
  category: SceneEventCategory | string;
  className?: string;
};

/**
 * Renders the icon for a scene event category. Returns null for unknown categories like "all".
 */
export function SceneCategoryIcon({
  category,
  className = '',
}: SceneCategoryIconProps) {
  const Icon = category in CATEGORY_ICONS
    ? CATEGORY_ICONS[category as SceneEventCategory]
    : null;

  if (!Icon) return null;

  return (
    <Icon
      className={className}
      aria-hidden
    />
  );
}
