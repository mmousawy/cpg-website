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
  /** Standalone pages (login, etc.) center the title; listing pages stay start-aligned */
  align?: 'start' | 'center';
  className?: string;
};

export default function PageHeading({
  title,
  description,
  aside,
  actions,
  subnav,
  align = 'start',
  className,
}: PageHeadingProps) {
  const pathname = usePathname();
  const hasMeta = description || actions;
  const showMobileSearch = !isOnboardingPath(pathname);
  const center = align === 'center';

  return (
    <>
      <StickyScrollHeader className={className}>
        <div
          className={clsx(
            'flex w-full items-center gap-2',
            center && showMobileSearch && 'max-sm:grid max-sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]',
          )}
        >
          <div
            className={clsx(
              'flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 sm:gap-3',
              center ? 'justify-center' : 'justify-start',
              center && showMobileSearch && 'max-sm:col-start-2',
            )}
          >
            <div
              className={clsx(
                'flex min-w-0 items-center gap-2',
                center ? 'justify-center' : 'justify-start',
              )}
            >
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
            <div
              className={clsx(
                'hidden shrink-0 max-sm:block',
                center && 'max-sm:col-start-3 max-sm:justify-self-end',
              )}
            >
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
            center && 'text-center',
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
