'use client';

import clsx from 'clsx';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import AnimatedStickyBarSlide from '@/components/layout/AnimatedStickyBarSlide';
import {
  mobileFloatingPillInsetClassName,
  mobileStickyBarTerminalSettleGapClassName,
  mobileStickyBottomWithGapClassName,
  mobileStickyChromeZClassName,
} from '@/components/layout/mobileChrome';
import { useReportMobileStickyChromeHeight } from '@/hooks/useReportMobileStickyChromeHeight';

type MobileStickyChromeStackProps = {
  nav: ReactNode;
  action?: ReactNode;
  showAction?: boolean;
  className?: string;
  hidden?: boolean;
};

/** Sticky mobile bottom stack that reports height for the tab bar scrim. */
export default function MobileStickyChromeStack({
  nav,
  action,
  showAction = false,
  className,
  hidden,
}: MobileStickyChromeStackProps) {
  const ref = useRef<HTMLDivElement>(null);
  useReportMobileStickyChromeHeight(ref, !hidden);

  const [navOpen, setNavOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const pendingRef = useRef<'nav' | 'action'>(showAction ? 'action' : 'nav');
  const navOpenRef = useRef(navOpen);
  const actionOpenRef = useRef(actionOpen);
  navOpenRef.current = navOpen;
  actionOpenRef.current = actionOpen;

  useEffect(() => {
    if (hidden) return;

    const target = showAction ? 'action' : 'nav';
    pendingRef.current = target;

    if (target === 'action') {
      if (navOpenRef.current) {
        setNavOpen(false);
        return;
      }
      if (!actionOpenRef.current) setActionOpen(true);
      return;
    }

    if (actionOpenRef.current) {
      setActionOpen(false);
      return;
    }
    if (!navOpenRef.current) setNavOpen(true);
  }, [showAction, hidden]);

  return (
    <>
      <div
        ref={ref}
        className={clsx(
          'md:hidden grid mt-3.5 md:mt-0',
          mobileStickyBottomWithGapClassName,
          mobileStickyChromeZClassName,
          mobileFloatingPillInsetClassName,
          className,
        )}
        hidden={hidden || undefined}
      >
        <AnimatedStickyBarSlide
          open={navOpen}
          onExited={() => {
            if (pendingRef.current === 'action') setActionOpen(true);
          }}
        >
          {nav}
        </AnimatedStickyBarSlide>
        {action != null && (
          <AnimatedStickyBarSlide
            open={actionOpen}
            onExited={() => {
              if (pendingRef.current === 'nav') setNavOpen(true);
            }}
          >
            {action}
          </AnimatedStickyBarSlide>
        )}
      </div>
      <div
        className={mobileStickyBarTerminalSettleGapClassName}
        hidden={hidden || undefined}
        aria-hidden
      />
    </>
  );
}
