'use client';

import clsx from 'clsx';
import { type ReactNode, useRef } from 'react';

import {
  mobileFloatingPillInsetClassName,
  mobileStickyChromeZClassName,
} from '@/components/layout/mobileChrome';
import { useReportMobileStickyChromeHeight } from '@/hooks/useReportMobileStickyChromeHeight';

type MobileStickyChromeStackProps = {
  children: ReactNode;
  className?: string;
  hidden?: boolean;
};

/** Sticky mobile bottom stack (section nav + action bar) that reports height for the tab bar scrim. */
export default function MobileStickyChromeStack({
  children,
  className,
  hidden,
}: MobileStickyChromeStackProps) {
  const ref = useRef<HTMLDivElement>(null);
  useReportMobileStickyChromeHeight(ref, !hidden);

  return (
    <div
      ref={ref}
      className={clsx(
        'md:hidden sticky bottom-0 max-sm:bottom-[var(--mobile-nav-offset,0px)] flex flex-col max-sm:gap-3.5',
        mobileStickyChromeZClassName,
        mobileFloatingPillInsetClassName,
        className,
      )}
      hidden={hidden || undefined}
    >
      {children}
    </div>
  );
}
