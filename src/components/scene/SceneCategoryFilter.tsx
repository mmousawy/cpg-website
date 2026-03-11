'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import { SceneCategoryIcon } from '@/components/scene/SceneCategoryIcon';
import {
  getSceneCategoryStyle,
  SCENE_EVENT_CATEGORIES,
  type SceneEventCategory,
} from '@/types/scene';

import CategoryLocationSVG from 'public/icons/category-location.svg';

type SceneCategoryFilterProps = {
  /** Callback when category changes (for client-side filtering) */
  onCategoryChange?: (category: SceneEventCategory | 'all') => void;
  /** Current selected category from URL or parent state */
  selectedCategory?: SceneEventCategory | 'all';
};

function CategoryPill(props: {
  label: string;
  icon: React.ReactNode;
  category: SceneEventCategory | 'all';
  isActive: boolean;
  onClick: () => void;
}) {
  const { label, icon, category, isActive, onClick } = props;
  const activeStyle = isActive ? getSceneCategoryStyle(category) : undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      style={activeStyle}
      className={`
        inline-flex items-center gap-2 rounded-full pr-2 pl-1 py-1 text-sm font-medium font-[family-name:var(--font-geist-mono)] transition-colors
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
        ${isActive
          ? 'border'
          : 'border border-transparent bg-neutral-200 dark:bg-[#252628] text-foreground hover:bg-neutral-300 dark:hover:bg-[#2e3032]'}
      `}
    >
      {icon && (
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white dark:bg-black/20"
        >
          <span
            className="[&_svg]:size-5"
          >
            {icon}
          </span>
        </span>
      )}
      {label}
    </button>
  );
}

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
      <CategoryPill
        label="All"
        icon={
          <CategoryLocationSVG
            className="size-5 fill-current"
            aria-hidden
          />
        }
        category="all"
        isActive={selectedCategory === 'all'}
        onClick={() => handleSelect('all')}
      />
      {SCENE_EVENT_CATEGORIES.map(({ value, label }) => (
        <CategoryPill
          key={value}
          label={label}
          icon={
            <SceneCategoryIcon
              category={value}
              className="size-5 fill-current"
            />
          }
          category={value}
          isActive={selectedCategory === value}
          onClick={() => handleSelect(value)}
        />
      ))}
    </div>
  );
}
