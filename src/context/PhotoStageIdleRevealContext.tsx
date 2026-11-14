'use client';

import { useIdleReveal } from '@/hooks/useIdleReveal';
import { createContext, useContext, useMemo, type ReactNode, type RefObject } from 'react';

export type PhotoStageIdleRevealValue = ReturnType<typeof useIdleReveal>;

/** How long member-tag dots stay visible on touch after landing on a photo. */
const TOUCH_TAG_PROMINENT_MS = 4500;

type PhotoStageIdleRevealContextValue = {
  chrome: PhotoStageIdleRevealValue;
  tags: PhotoStageIdleRevealValue;
};

const PhotoStageIdleRevealContext = createContext<PhotoStageIdleRevealContextValue | null>(null);

export function PhotoStageIdleRevealProvider({
  targetRef,
  routeKey,
  children,
}: {
  targetRef: RefObject<HTMLElement | null>;
  routeKey: string;
  children: ReactNode;
}) {
  const chrome = useIdleReveal(targetRef, routeKey, { touchRoutePhase: 'hidden' });
  const tags = useIdleReveal(targetRef, routeKey, {
    touchRoutePhase: 'prominent',
    prominentMs: TOUCH_TAG_PROMINENT_MS,
  });

  const value = useMemo(() => ({ chrome, tags }), [chrome, tags]);

  return (
    <PhotoStageIdleRevealContext.Provider
      value={value}
    >
      {children}
    </PhotoStageIdleRevealContext.Provider>
  );
}

/** Idle reveal for back / full screen controls. */
export function usePhotoStageIdleReveal() {
  return useContext(PhotoStageIdleRevealContext)?.chrome ?? null;
}

/** Idle reveal for on-photo member tag dots (shown longer on touch after each photo). */
export function usePhotoTagIdleReveal() {
  return useContext(PhotoStageIdleRevealContext)?.tags ?? null;
}
