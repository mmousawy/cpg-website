'use client';

import clsx from 'clsx';

import Button from '@/components/shared/Button';
import { GEAR_CATEGORY_LABELS, type UserGearItem } from '@/lib/gear/types';
import EditMiniSVG from 'public/icons/edit-mini.svg';
import TrashMiniSVG from 'public/icons/trash-mini.svg';

type GearItemRowProps = {
  item: UserGearItem;
  isOwner: boolean;
  showCategory?: boolean;
  /** Lighter row inside a nested inventory panel (account page). */
  embedded?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
};

export default function GearItemRow({
  item,
  isOwner,
  showCategory = false,
  embedded = false,
  onEdit,
  onRemove,
}: GearItemRowProps) {
  const multiLine = showCategory || Boolean(item.note);

  return (
    <div
      className={clsx(
        'group flex justify-between px-3 pr-0 py-2.5 gap-3',
        embedded && 'pr-2',
        multiLine ? 'items-start' : 'items-center',
        embedded
          ? 'border-b border-border-color last:border-b-0'
          : 'border-border-color rounded-lg border bg-white dark:bg-white/5',
      )}
    >
      <div
        className="min-w-0 flex-1"
      >
        <p
          className={clsx('font-medium leading-snug', embedded && 'text-sm sm:text-base')}
        >
          {item.name}
        </p>
        {showCategory && (
          <p
            className="text-foreground/60 text-xs"
          >
            {GEAR_CATEGORY_LABELS[item.category]}
          </p>
        )}
        {item.note && (
          <p
            className="text-foreground/70 text-sm mt-1"
          >
            {item.note}
          </p>
        )}
      </div>
      {isOwner && (
        <div
          className="flex shrink-0 items-center gap-2 sm:gap-4 opacity-100 transition-opacity md:gap-0.5 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="p-1! text-foreground/70 md:px-2! md:py-1! hover:text-foreground focus-visible:text-foreground"
            aria-label={`Edit ${item.name}`}
            onClick={onEdit}
            icon={(
              <EditMiniSVG
                className="size-4 md:size-5"
                aria-hidden
              />
            )}
          >
            <span
              className="sr-only"
            >
              Edit
            </span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="p-1! text-foreground/70 hover:text-red-500 focus-visible:text-red-500 md:px-2! md:py-1!"
            aria-label={`Remove ${item.name}`}
            onClick={onRemove}
            icon={(
              <TrashMiniSVG
                className="size-4 md:size-5"
                aria-hidden
              />
            )}
          >
            <span
              className="sr-only"
            >
              Remove
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}
