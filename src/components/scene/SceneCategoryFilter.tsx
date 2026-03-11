'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import Button from '@/components/shared/Button';
import { SCENE_EVENT_CATEGORIES, type SceneEventCategory } from '@/types/scene';

type SceneCategoryFilterProps = {
  /** Callback when category changes (for client-side filtering) */
  onCategoryChange?: (category: SceneEventCategory | 'all') => void;
  /** Current selected category from URL or parent state */
  selectedCategory?: SceneEventCategory | 'all';
};

export default function SceneCategoryFilter({
  onCategoryChange,
  selectedCategory: controlledCategory,
}: SceneCategoryFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlCategory = searchParams.get('category');
  const selectedCategory =
    controlledCategory ??
    (urlCategory && SCENE_EVENT_CATEGORIES.some((c) => c.value === urlCategory)
      ? (urlCategory as SceneEventCategory)
      : 'all');

  const handleSelect = useCallback(
    (category: SceneEventCategory | 'all') => {
      if (onCategoryChange) {
        onCategoryChange(category);
      } else {
        const params = new URLSearchParams(searchParams.toString());
        if (category === 'all') {
          params.delete('category');
        } else {
          params.set('category', category);
        }
        const query = params.toString();
        router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false });
      }
    },
    [onCategoryChange, pathname, router, searchParams],
  );

  return (
    <div
      className="flex flex-wrap gap-2"
    >
      <Button
        variant={selectedCategory === 'all' ? 'primary' : 'secondary'}
        size="sm"
        onClick={() => handleSelect('all')}
      >
        All
      </Button>
      {SCENE_EVENT_CATEGORIES.map(({ value, label }) => (
        <Button
          key={value}
          variant={selectedCategory === value ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => handleSelect(value)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
