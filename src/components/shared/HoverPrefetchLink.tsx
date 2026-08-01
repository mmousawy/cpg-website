'use client';

import Link from 'next/link';
import { useState, type ComponentProps } from 'react';

/**
 * Defers route prefetch until hover/focus/touch to avoid flooding dense photo grids.
 */
export default function HoverPrefetchLink({
  onMouseEnter,
  onFocus,
  onTouchStart,
  ...props
}: ComponentProps<typeof Link>) {
  const [shouldPrefetch, setShouldPrefetch] = useState(false);

  const enablePrefetch = () => {
    setShouldPrefetch(true);
  };

  return (
    <Link
      {...props}
      prefetch={shouldPrefetch ? null : false}
      onMouseEnter={(event) => {
        enablePrefetch();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        enablePrefetch();
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        enablePrefetch();
        onTouchStart?.(event);
      }}
    />
  );
}
