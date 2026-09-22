'use client';

import clsx from 'clsx';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';

import { getStickyBarSlideDurationMs } from '@/components/layout/mobileChrome';
import { useAppNavigationBusy } from '@/lib/appNavigation';

const recentRevealAt = new Map<string, number>();
const REVEAL_LOCK_MS = 500;

type AnimatedStickyBarSlideProps = {
  open: boolean;
  children: ReactNode;
  className?: string;
  innerRef?: Ref<HTMLDivElement>;
  /** Called after the hide slide finishes and the bar unmounts. */
  onExited?: () => void;
};

export default function AnimatedStickyBarSlide({
  open,
  children,
  className,
  innerRef,
  onExited,
}: AnimatedStickyBarSlideProps) {
  const pathname = usePathname();
  const navBusy = useAppNavigationBusy();
  const canReveal = open && !navBusy;

  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const renderedRef = useRef(false);
  const onExitedRef = useRef(onExited);
  onExitedRef.current = onExited;

  if (canReveal && !shouldRender) {
    setShouldRender(true);
  }

  useEffect(() => {
    let animFrame1: number | undefined;
    let animFrame2: number | undefined;
    let unmountTimer: ReturnType<typeof setTimeout> | undefined;

    if (canReveal) {
      renderedRef.current = true;
      const now = Date.now();
      const lastReveal = recentRevealAt.get(pathname) ?? 0;
      const skipAppear = now - lastReveal < REVEAL_LOCK_MS;
      recentRevealAt.set(pathname, now);

      if (skipAppear) {
        setIsVisible(true);
      } else {
        animFrame1 = requestAnimationFrame(() => {
          animFrame2 = requestAnimationFrame(() => setIsVisible(true));
        });
      }
    } else if (renderedRef.current && !open) {
      setIsVisible(false);
      unmountTimer = setTimeout(() => {
        renderedRef.current = false;
        setShouldRender(false);
        onExitedRef.current?.();
      }, getStickyBarSlideDurationMs());
    }

    return () => {
      if (animFrame1) cancelAnimationFrame(animFrame1);
      if (animFrame2) cancelAnimationFrame(animFrame2);
      if (unmountTimer) clearTimeout(unmountTimer);
    };
  }, [canReveal, open, pathname]);

  if (!shouldRender) return null;

  return (
    <div
      ref={innerRef}
      className={clsx('col-start-1 row-start-1 w-full', className)}
    >
      <div
        className={clsx(
          'mobile-sticky-bar-slide w-full',
          !isVisible && 'pointer-events-none',
        )}
        data-open={isVisible ? '' : undefined}
        aria-hidden={!isVisible}
      >
        {children}
      </div>
    </div>
  );
}
