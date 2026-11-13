'use client';

import { usePhotoOverview } from '@/context/PhotoOverviewContext';
import { useIdleReveal } from '@/hooks/useIdleReveal';
import clsx from 'clsx';
import Link from 'next/link';
import ArrowLeftSVG from 'public/icons/arrow-left.svg';
import { getPhotoBackLabel } from '@/utils/photoOverviewNavigation';
import { prepareScrollRestoreForNavigation } from '@/utils/routeScrollNavigation';
import { usePathname } from 'next/navigation';
import type { RefObject } from 'react';

type PhotoPageBackButtonProps = {
  fallbackHref: string;
  fallbackLabel: string;
  revealTargetRef: RefObject<HTMLElement | null>;
  className?: string;
};

export default function PhotoPageBackButton({
  fallbackHref,
  fallbackLabel,
  revealTargetRef,
  className,
}: PhotoPageBackButtonProps) {
  const pathname = usePathname();
  const overviewPath = usePhotoOverview();
  const href = overviewPath ?? fallbackHref;
  const { text, ariaLabel } = getPhotoBackLabel({ overviewPath, fallbackLabel });
  const { opacity, pointerEvents, onPillEnter, onPillLeave } = useIdleReveal(
    revealTargetRef,
    pathname,
  );

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
        'absolute left-2 top-2 z-30 max-w-[min(100%-1rem,20rem)]',
        'inline-flex h-8 items-center gap-1 rounded-full border border-border-color bg-background/90 px-2.5',
        'text-sm font-medium text-primary shadow-sm backdrop-blur-sm',
        'transition-[opacity,border-color,background-color] duration-300 hover:border-primary hover:bg-background',
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
