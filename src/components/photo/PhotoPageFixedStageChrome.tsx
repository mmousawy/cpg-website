'use client';

import PhotoPageBackButton from '@/components/photo/PhotoPageBackButton';
import PhotoPageFullscreenButton from '@/components/photo/PhotoPageFullscreenButton';
import { usePhotoStageChromeSlot } from '@/context/PhotoStageChromeSlotContext';

/**
 * Back / full screen over the photo viewer section (fixed while photos swipe).
 */
export default function PhotoPageFixedStageChrome() {
  const slot = usePhotoStageChromeSlot();

  if (!slot) return null;

  return (
    <div
      data-photo-stage-chrome=""
      className="contents"
    >
      <PhotoPageBackButton
        fallbackHref={slot.fallbackHref}
        fallbackLabel={slot.fallbackLabel}
        idleRevealRouteKey={slot.idleRevealRouteKey}
        variant="floating"
      />
      <PhotoPageFullscreenButton
        idleRevealRouteKey={slot.idleRevealRouteKey}
        variant="floating"
      />
    </div>
  );
}
