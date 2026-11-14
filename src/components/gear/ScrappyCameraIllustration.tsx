'use client';

import { scrappyCameraIconUrl } from '@/lib/gear/scrappyCameraIcon';
import clsx from 'clsx';
import { useState, type ReactNode } from 'react';

export type ScrappyCameraIllustrationProps = {
  camera: string;
  className?: string;
  fallback?: ReactNode;
};

/** Flickr scrappy camera drawing for a camera display string (PoC). */
export default function ScrappyCameraIllustration({
  camera,
  className,
  fallback = null,
}: ScrappyCameraIllustrationProps) {
  const [failed, setFailed] = useState(false);
  const src = scrappyCameraIconUrl(camera);

  if (!src || failed) {
    return fallback;
  }

  return (
    <img
      key={src}
      src={src}
      alt=""
      className={clsx('dark:invert', className)}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
