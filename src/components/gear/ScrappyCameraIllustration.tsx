'use client';

import { scrappyCameraIconUrl } from '@/lib/gear/scrappyCameraIcon';
import clsx from 'clsx';
import Image from 'next/image';
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
    <Image
      key={src}
      src={src}
      alt=""
      width={184}
      height={92}
      className={clsx('h-auto w-auto dark:invert', className)}
      onError={() => setFailed(true)}
    />
  );
}
