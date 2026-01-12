'use client';

import Button from '@/components/shared/Button';
import clsx from 'clsx';
import { ReactNode } from 'react';

import CloseMiniSVG from 'public/icons/close-mini.svg';
import EditMiniSVG from 'public/icons/edit-mini.svg';

interface MobileActionBarProps {
  /** Number of selected items */
  selectedCount: number;
  /** Callback when Edit button is clicked */
  onEdit: () => void;
  /** Callback when selection is cleared */
  onClearSelection: () => void;
  /** Additional action buttons (e.g., Delete, Add to album) */
  actions?: ReactNode;
  /** Whether the bar should be visible */
  visible?: boolean;
}

export default function MobileActionBar({
  selectedCount,
  onEdit,
  onClearSelection,
  actions,
  visible = true,
}: MobileActionBarProps) {
  if (!visible || selectedCount === 0) return null;

  return (
    <div
      className={clsx(
        'border-t border-border-color-strong bg-background-light shadow-lg',
        'transition-transform duration-300 ease-out',
        visible ? 'translate-y-0' : 'translate-y-full',
      )}
    >
      {/* Gradient fade at top */}
      <div className="absolute -top-[13px] left-0 right-0 h-3 bg-linear-to-b from-transparent to-background pointer-events-none" />

      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Selection count and clear button */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground/70">
              {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
            </span>
            <button
              onClick={onClearSelection}
              className="flex items-center justify-center rounded-full border border-border-color p-1 hover:bg-background transition-colors"
              aria-label="Clear selection"
            >
              <CloseMiniSVG className="size-4 fill-foreground" />
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {actions}
            <Button onClick={onEdit} variant="primary" size="sm" icon={<EditMiniSVG className="size-5 -ml-0.5" />}>
              <span className="hidden md:inline-block">Edit</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
