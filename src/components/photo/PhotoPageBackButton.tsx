'use client';

import { usePhotoOverview } from '@/context/PhotoOverviewContext';
import { usePhotoStageIdleReveal } from '@/context/PhotoStageIdleRevealContext';
import { useIdleReveal } from '@/hooks/useIdleReveal';
import clsx from 'clsx';
import Link from 'next/link';
import ArrowLeftSVG from 'public/icons/arrow-left.svg';
import { getPhotoBackLabel } from '@/utils/photoOverviewNavigation';
import { prepareScrollRestoreForNavigation } from '@/utils/routeScrollNavigation';
import type { RefObject } from 'react';

type PhotoPageBackButtonProps = {
  fallbackHref: string;
  fallbackLabel: string;
  className?: string;
  variant?: 'floating' | 'toolbar';
  revealTargetRef?: RefObject<HTMLElement | null>;
  /**
   * When paging inside a collection (filmstrip), keep this stable so the pill
   * does not pop back in on every photo URL change. Pointer/hover reveal still works.
   */
  idleRevealRouteKey?: string;
};

type PhotoPageBackButtonChromeProps = PhotoPageBackButtonProps & {
  opacity: number;
  pointerEvents: 'auto' | 'none';
  onPillEnter?: () => void;
  onPillLeave?: () => void;
};

function PhotoPageBackButtonChrome({
  fallbackHref,
  fallbackLabel,
  className,
  variant = 'floating',
  opacity,
  pointerEvents,
  onPillEnter,
  onPillLeave,
}: PhotoPageBackButtonChromeProps) {
  const overviewPath = usePhotoOverview();
  const href = overviewPath ?? fallbackHref;
  const { text, ariaLabel } = getPhotoBackLabel({ overviewPath, fallbackLabel });

  return (
    <Link
      href={href}
      prefetch={false}
      onClick={() => {
        if (overviewPath) {
          prepareScrollRestoreForNavigation(overviewPath);
        }
      }}
      onMouseEnter={onPillEnter}
      onMouseLeave={onPillLeave}
      onFocus={onPillEnter}
      onBlur={onPillLeave}
      style={{ opacity, pointerEvents }}
      className={clsx(
        'inline-flex h-8 items-center gap-1 rounded-full border border-border-color',
        variant !== 'toolbar' && 'px-2.5',
        'text-sm font-medium text-foreground',
        variant === 'floating' && [
          'pointer-events-auto absolute left-2 top-2 z-30 max-w-[min(100%-1rem,20rem)]',
          'bg-background/90 shadow-sm backdrop-blur-sm',
          'transition-[opacity,border-color,background-color] duration-300 hover:border-primary hover:bg-background',
        ],
        variant === 'toolbar' && [
          'min-w-0 max-w-[min(100%,20rem)] shrink border-transparent bg-transparent pl-0 pr-2 shadow-none',
          'hover:border-border-color hover:bg-background-medium',
        ],
        className,
      )}
      aria-label={ariaLabel}
    >
      <ArrowLeftSVG
        className="size-4 shrink-0 fill-current"
        aria-hidden
      />
      <span
        className="truncate"
      >
        {text}
      </span>
    </Link>
  );
}

function PhotoPageBackButtonWithContext(props: PhotoPageBackButtonProps) {
  const stageReveal = usePhotoStageIdleReveal();
  const opacity = stageReveal?.opacity ?? 1;
  const pointerEvents = stageReveal?.pointerEvents ?? 'auto';

  return (
    <PhotoPageBackButtonChrome
      {...props}
      opacity={opacity}
      pointerEvents={pointerEvents}
      onPillEnter={stageReveal?.onPillEnter}
      onPillLeave={stageReveal?.onPillLeave}
    />
  );
}

function PhotoPageBackButtonWithCollectionReveal({
  revealTargetRef,
  idleRevealRouteKey,
  ...props
}: PhotoPageBackButtonProps & {
  revealTargetRef: RefObject<HTMLElement | null>;
  idleRevealRouteKey: string;
}) {
  const { opacity, pointerEvents, onPillEnter, onPillLeave } = useIdleReveal(
    revealTargetRef,
    idleRevealRouteKey,
  );

  return (
    <PhotoPageBackButtonChrome
      {...props}
      opacity={opacity}
      pointerEvents={pointerEvents}
      onPillEnter={onPillEnter}
      onPillLeave={onPillLeave}
    />
  );
}

export default function PhotoPageBackButton(props: PhotoPageBackButtonProps) {
  const { variant = 'floating', revealTargetRef, idleRevealRouteKey } = props;

  if (variant === 'toolbar') {
    return (
      <PhotoPageBackButtonChrome
        {...props}
        opacity={1}
        pointerEvents="auto"
      />
    );
  }

  if (revealTargetRef && idleRevealRouteKey) {
    return (
      <PhotoPageBackButtonWithCollectionReveal
        {...props}
        revealTargetRef={revealTargetRef}
        idleRevealRouteKey={idleRevealRouteKey}
      />
    );
  }
  return (
    <PhotoPageBackButtonWithContext
      {...props}
    />
  );
}
