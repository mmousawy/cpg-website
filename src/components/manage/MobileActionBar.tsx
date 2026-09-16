'use client';

import Button from '@/components/shared/Button';
import AnimatedStickyBarSlide from '@/components/layout/AnimatedStickyBarSlide';
import {
  mobileFloatingPillClassName,
  mobileFloatingPillInsetClassName,
  mobileStickyChromeZClassName,
} from '@/components/layout/mobileChrome';
import { useReportMobileStickyChromeHeight } from '@/hooks/useReportMobileStickyChromeHeight';
import clsx from 'clsx';
import { ReactNode, useRef } from 'react';

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
  /** Hide the Edit button (e.g. when selection includes non-owned photos) */
  hideEdit?: boolean;
}

export default function MobileActionBar({
  selectedCount,
  onEdit,
  onClearSelection,
  actions,
  visible = true,
  hideEdit = false,
}: MobileActionBarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const isOpen = visible && selectedCount > 0;

  useReportMobileStickyChromeHeight(rootRef, isOpen);

  return (
    <AnimatedStickyBarSlide
      open={isOpen}
      innerRef={rootRef}
      className={clsx(
        'md:hidden fixed inset-x-0',
        mobileFloatingPillInsetClassName,
        mobileStickyChromeZClassName,
        'max-sm:bottom-(--mobile-nav-offset,0px)',
      )}
    >
      <div className={clsx(mobileFloatingPillClassName, 'overflow-hidden')}>
        <div className="px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-medium text-foreground/80">
                {selectedCount}
                {' '}
                {selectedCount === 1 ? 'item' : 'items'}
                {' '}
                selected
              </span>
              <button
                onClick={onClearSelection}
                className="flex shrink-0 items-center justify-center rounded-full border border-border-color p-1 hover:bg-background transition-colors"
                aria-label="Clear selection"
              >
                <CloseMiniSVG className="size-4 fill-foreground" />
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {actions}
              {!hideEdit && (
                <Button
                  onClick={onEdit}
                  variant="primary"
                  size="sm"
                  icon={<EditMiniSVG className="size-5 -ml-0.5" />}
                >
                  <span className="hidden md:inline-block">Edit</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AnimatedStickyBarSlide>
  );
}
