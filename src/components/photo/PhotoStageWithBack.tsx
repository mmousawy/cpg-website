'use client';

import { PhotoLightboxOpenProvider } from '@/context/PhotoLightboxOpenContext';
import PhotoPageFixedStageChrome from '@/components/photo/PhotoPageFixedStageChrome';
import { PhotoStageChromeSlotProvider } from '@/context/PhotoStageChromeSlotContext';
import { PhotoStageIdleRevealProvider } from '@/context/PhotoStageIdleRevealContext';
import { useHasHover } from '@/hooks/useHasHover';
import clsx from 'clsx';
import { usePathname } from 'next/navigation';
import { useRef, type ReactNode } from 'react';

type PhotoStageWithBackProps = {
  children: ReactNode;
  fallbackHref: string;
  fallbackLabel: string;
  className?: string;
  /**
   * Stable idle-reveal key while paging in a collection (filmstrip). Omits per-photo URL
   * so the back pill does not flash on each photo change. Pointer/hover reveal still works.
   */
  idleRevealRouteKey?: string;
};

export default function PhotoStageWithBack({
  children,
  fallbackHref,
  fallbackLabel,
  className,
  idleRevealRouteKey,
}: PhotoStageWithBackProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const photoAreaRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const hasHover = useHasHover();
  /** Includes fixed stage chrome so control taps do not dismiss the UI on touch. */
  const idleTargetRef = stageRef;

  return (
    <div
      ref={stageRef}
      className={className}
    >
      <PhotoStageChromeSlotProvider
        value={{ fallbackHref, fallbackLabel, idleRevealRouteKey }}
      >
        <PhotoLightboxOpenProvider>
          <PhotoStageIdleRevealProvider
            targetRef={idleTargetRef}
            routeKey={pathname}
          >
            <PhotoPageFixedStageChrome />
            <div
              ref={photoAreaRef}
              className={clsx(
                'relative flex w-full min-h-0 flex-1 touch-pan-y items-center justify-center overflow-hidden',
                hasHover && 'contents',
              )}
            >
              {children}
            </div>
          </PhotoStageIdleRevealProvider>
        </PhotoLightboxOpenProvider>
      </PhotoStageChromeSlotProvider>
    </div>
  );
}
