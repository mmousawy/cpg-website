'use client';

import { usePhotoLightboxOpen } from '@/context/PhotoLightboxOpenContext';
import { usePhotoStageIdleReveal } from '@/context/PhotoStageIdleRevealContext';
import { useIdleReveal } from '@/hooks/useIdleReveal';
import clsx from 'clsx';
import FullscreenSVG from 'public/icons/fullscreen.svg';
import type { RefObject } from 'react';

type PhotoPageFullscreenButtonProps = {
  className?: string;
  variant?: 'floating' | 'toolbar';
  revealTargetRef?: RefObject<HTMLElement | null>;
  idleRevealRouteKey?: string;
};

type PhotoPageFullscreenButtonChromeProps = PhotoPageFullscreenButtonProps & {
  opacity: number;
  pointerEvents: 'auto' | 'none';
  onOpen: () => void;
  onPillEnter?: () => void;
  onPillLeave?: () => void;
};

function PhotoPageFullscreenButtonChrome({
  className,
  variant = 'floating',
  opacity,
  pointerEvents,
  onOpen,
  onPillEnter,
  onPillLeave,
}: PhotoPageFullscreenButtonChromeProps) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        onOpen();
      }}
      onMouseEnter={onPillEnter}
      onMouseLeave={onPillLeave}
      onFocus={onPillEnter}
      onBlur={onPillLeave}
      style={{ opacity, pointerEvents }}
      className={clsx(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-full border text-foreground',
        variant === 'floating' && [
          'pointer-events-auto absolute right-2 top-2 z-30 border-border-color bg-background/90',
          'shadow-sm backdrop-blur-sm',
          'transition-[opacity,border-color,background-color] duration-300 hover:border-primary hover:bg-background',
        ],
        variant === 'toolbar' && [
          'border-transparent bg-transparent',
          'hover:border-border-color hover:bg-background-medium',
        ],
        className,
      )}
      aria-label="View full screen"
    >
      <FullscreenSVG
        className="size-4 shrink-0 stroke-current"
        aria-hidden
      />
    </button>
  );
}

function PhotoPageFullscreenButtonWithContext(props: PhotoPageFullscreenButtonProps) {
  const stageReveal = usePhotoStageIdleReveal();
  const lightboxOpen = usePhotoLightboxOpen();
  const opacity = stageReveal?.opacity ?? 1;
  const pointerEvents = stageReveal?.pointerEvents ?? 'auto';

  return (
    <PhotoPageFullscreenButtonChrome
      {...props}
      opacity={opacity}
      pointerEvents={pointerEvents}
      onOpen={() => lightboxOpen?.open()}
      onPillEnter={stageReveal?.onPillEnter}
      onPillLeave={stageReveal?.onPillLeave}
    />
  );
}

function PhotoPageFullscreenButtonWithCollectionReveal({
  revealTargetRef,
  idleRevealRouteKey,
  ...props
}: PhotoPageFullscreenButtonProps & {
  revealTargetRef: RefObject<HTMLElement | null>;
  idleRevealRouteKey: string;
}) {
  const { opacity, pointerEvents, onPillEnter, onPillLeave } = useIdleReveal(
    revealTargetRef,
    idleRevealRouteKey,
  );
  const lightboxOpen = usePhotoLightboxOpen();

  return (
    <PhotoPageFullscreenButtonChrome
      {...props}
      opacity={opacity}
      pointerEvents={pointerEvents}
      onOpen={() => lightboxOpen?.open()}
      onPillEnter={onPillEnter}
      onPillLeave={onPillLeave}
    />
  );
}

function PhotoPageFullscreenButtonToolbar(props: PhotoPageFullscreenButtonProps) {
  const lightboxOpen = usePhotoLightboxOpen();
  return (
    <PhotoPageFullscreenButtonChrome
      {...props}
      variant="toolbar"
      opacity={1}
      pointerEvents="auto"
      onOpen={() => lightboxOpen?.open()}
    />
  );
}

export default function PhotoPageFullscreenButton(props: PhotoPageFullscreenButtonProps) {
  const { variant = 'floating', revealTargetRef, idleRevealRouteKey } = props;

  if (variant === 'toolbar') {
    return (
      <PhotoPageFullscreenButtonToolbar
        {...props}
      />
    );
  }

  if (revealTargetRef && idleRevealRouteKey) {
    return (
      <PhotoPageFullscreenButtonWithCollectionReveal
        {...props}
        revealTargetRef={revealTargetRef}
        idleRevealRouteKey={idleRevealRouteKey}
      />
    );
  }
  return (
    <PhotoPageFullscreenButtonWithContext
      {...props}
    />
  );
}
