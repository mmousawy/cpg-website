'use client';

import AnimatedStickyBarSlide from '@/components/layout/AnimatedStickyBarSlide';
import {
  mobileFixedBottomChromeClassName,
  mobileFloatingPillClassName,
  mobileFloatingPillInsetClassName,
  mobileStickyChromeZClassName,
} from '@/components/layout/mobileChrome';
import Button from '@/components/shared/Button';
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
  /**
   * Keep the bar open with this label when nothing is selected.
   * Used for the album detail bar.
   */
  persistentLabel?: string;
  /** Label for the persistent bar's action. Defaults to "Edit album". */
  persistentActionLabel?: string;
}

export default function MobileActionBar({
  selectedCount,
  onEdit,
  onClearSelection,
  actions,
  visible = true,
  hideEdit = false,
  persistentLabel,
  persistentActionLabel = 'Edit album',
}: MobileActionBarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const isPersistent = !!persistentLabel && selectedCount === 0;
  const isOpen = visible && (selectedCount > 0 || isPersistent);

  useReportMobileStickyChromeHeight(rootRef, isOpen, true);

  return (
    <AnimatedStickyBarSlide
      open={isOpen}
      innerRef={rootRef}
      className={clsx(
        'md:hidden pointer-events-none',
        mobileFixedBottomChromeClassName,
        mobileFloatingPillInsetClassName,
        mobileStickyChromeZClassName,
      )}
    >
      <div
        className={clsx(mobileFloatingPillClassName, 'pointer-events-auto overflow-hidden')}
      >
        <div
          className="px-3 py-2.5"
        >
          <div
            className="flex items-center justify-between gap-3"
          >
            <div
              className="flex min-w-0 items-center gap-2"
            >
              {isPersistent ? (
                <span
                  className="truncate text-sm font-medium text-foreground/80"
                >
                  {persistentLabel}
                </span>
              ) : (
                <>
                  <span
                    className="truncate text-sm font-medium text-foreground/80"
                  >
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
                    <CloseMiniSVG
                      className="size-4 fill-foreground"
                    />
                  </button>
                </>
              )}
            </div>

            <div
              className="flex shrink-0 items-center gap-2"
            >
              {actions}
              {!hideEdit && (
                <Button
                  id="photos-tour-mobile-edit"
                  onClick={onEdit}
                  variant="primary"
                  size="sm"
                  icon={persistentActionLabel === 'Edit album' || !isPersistent ? (
                    <EditMiniSVG
                      className="size-5 -ml-0.5"
                    />
                  ) : undefined}
                >
                  <span
                    className={isPersistent ? undefined : 'hidden md:inline-block'}
                  >
                    {isPersistent ? persistentActionLabel : 'Edit'}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AnimatedStickyBarSlide>
  );
}
