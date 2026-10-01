'use client';

import clsx from 'clsx';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

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

  const lastGridHeightRef = useRef(0);
  const [handoffMinHeight, setHandoffMinHeight] = useState<number | undefined>();

  const syncGridHandoffMinHeight = () => {
    const node = ref.current;
    if (!node) return;
    const height = node.getBoundingClientRect().height;
    if (height > 1) {
      lastGridHeightRef.current = height;
    }
    const hasSlide = node.querySelector('.mobile-sticky-bar-slide') != null;
    if (!hasSlide && lastGridHeightRef.current > 0) {
      setHandoffMinHeight(lastGridHeightRef.current);
    } else {
      setHandoffMinHeight(undefined);
    }
  };

  useLayoutEffect(() => {
    if (hidden) return;
    syncGridHandoffMinHeight();
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(syncGridHandoffMinHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, [hidden, navOpen, actionOpen]);

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
        style={handoffMinHeight ? { minHeight: handoffMinHeight } : undefined}
        hidden={hidden || undefined}
      >
        <AnimatedStickyBarSlide
          alwaysAnimate
          open={navOpen}
          onExited={() => {
            if (pendingRef.current === 'action') setActionOpen(true);
          }}
        >
          {nav}
        </AnimatedStickyBarSlide>
        {action != null && (
          <AnimatedStickyBarSlide
            alwaysAnimate
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
