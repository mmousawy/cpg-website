import clsx from 'clsx';

import { GEAR_CATEGORY_ICONS } from '@/lib/gear/gearCategoryIcons';
import type { GearCategory } from '@/lib/gear/types';

type GearCategoryIconBadgeProps = {
  category: GearCategory;
  className?: string;
};

/** Circular category icon used beside gear labels and section headings. */
export default function GearCategoryIconBadge({
  category,
  className,
}: GearCategoryIconBadgeProps) {
  const Icon = GEAR_CATEGORY_ICONS[category];

  return (
    <span
      className={clsx(
        'flex size-8 shrink-0 items-center justify-center rounded-full text-foreground',
        'bg-white shadow-[0_1px_2px_0px_#00000020] dark:bg-background-light',
        className,
      )}
      aria-hidden
    >
      <Icon
        className="size-4"
        aria-hidden
      />
    </span>
  );
}
