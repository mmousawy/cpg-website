'use client';

import clsx from 'clsx';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import PageHeadingMobileSearch from '@/components/layout/PageHeadingMobileSearch';
import StickyScrollHeader from '@/components/layout/StickyScrollHeader';
import { isOnboardingPath } from '@/utils/onboardingPath';
type PageHeadingProps = {
  title: string;
  description?: ReactNode;
  /** Help link, draft badge, etc. — shown beside the title in the sticky row */
  aside?: ReactNode;
  /** Primary actions (e.g. Create) — below the sticky title, not inside it */
  actions?: ReactNode;
  /** Segmented section links (e.g. Events | Scene) — mobile sticky row only; desktop uses main nav */
  subnav?: ReactNode;
  className?: string;
};

export default function PageHeading({
  title,
  description,
  aside,
  actions,
  subnav,
  className,
}: PageHeadingProps) {
  const pathname = usePathname();
  const hasMeta = description || actions;
  const showMobileSearch = !isOnboardingPath(pathname);

  return (
    <>
      <StickyScrollHeader className={className}>
        <div className="flex w-full items-center gap-2">
          <div
            className={clsx(
              'flex min-w-0 flex-1 flex-wrap items-center justify-start gap-x-2 gap-y-1 sm:gap-3',
            )}
          >
            <div className="flex min-w-0 items-center justify-start gap-2">
              <h1
                className={clsx(
                  'font-bold font-heading',
                  subnav
                    ? 'text-xl leading-tight sm:text-3xl'
                    : 'text-2xl sm:text-3xl',
                )}
              >
                {title}
              </h1>
              {aside}
            </div>
            {subnav ? (
              <div className="hidden min-w-0 shrink-0 max-sm:block">{subnav}</div>
            ) : null}
          </div>
          {showMobileSearch ? (
            <div className="hidden shrink-0 max-sm:block">
              <PageHeadingMobileSearch />
            </div>
          ) : null}
        </div>
      </StickyScrollHeader>
      {hasMeta ? (
        <div
          className={clsx(
            'mb-8 mt-1',
            className,
            actions && 'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4',
          )}
        >
          {description && (
            <div className="text-base text-foreground/80 sm:text-lg">
              {description}
            </div>
          )}
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      ) : (
        <div className={clsx('mb-8', className)} />
      )}
    </>
  );
}
