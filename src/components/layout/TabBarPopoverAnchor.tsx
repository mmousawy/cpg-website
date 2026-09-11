'use client';

import clsx from 'clsx';

import AnimatedPopoverPanel from '@/components/shared/AnimatedPopoverPanel';

type TabBarPopoverAnchorProps = {
  open: boolean;
  widthClass?: string;
  panelClassName?: string;
  /** `end` for the rightmost tab so wide panels stay on screen. */
  align?: 'center' | 'end';
  children: React.ReactNode;
};

/** Popover anchored above a tab bar item. */
export default function TabBarPopoverAnchor({
  open,
  widthClass = 'w-36',
  panelClassName,
  align = 'center',
  children,
}: TabBarPopoverAnchorProps) {
  return (
    <div
      className={clsx(
        'pointer-events-none absolute bottom-full z-50 mb-3.5',
        widthClass,
        align === 'center' && 'left-1/2 -translate-x-1/2',
        align === 'end' && 'right-0',
      )}
    >
      <AnimatedPopoverPanel
        open={open}
        origin={align === 'end' ? 'right' : 'center'}
        className={clsx(
          'pointer-events-auto overflow-hidden rounded-xl border border-border-color-strong bg-background-light bg-no-noise shadow-lg',
          panelClassName,
        )}
      >
        {children}
      </AnimatedPopoverPanel>
    </div>
  );
}
