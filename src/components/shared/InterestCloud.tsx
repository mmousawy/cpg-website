'use client';

import type { Interest } from '@/types/interests';
import clsx from 'clsx';
import Link from 'next/link';
import { Fragment } from 'react';

interface InterestCloudProps {
  interests: Interest[];
  /** Currently active interest (if on an interest page) */
  activeInterest?: string;
  className?: string;
}

/**
 * Interest list as plain text links separated by middots.
 * Interests link to /members/interest/<interest>
 */
export default function InterestCloud({
  interests,
  activeInterest,
  className,
}: InterestCloudProps) {
  if (interests.length === 0) {
    return null;
  }

  return (
    <div
      className={clsx('flex flex-wrap items-baseline gap-2', className)}
    >
      {interests.map((interest, index) => {
        const isActive = activeInterest === interest.name;
        const count = interest.count || 0;

        return (
          <Fragment
            key={interest.id}
          >
            <Link
              href={`/members/interest/${encodeURIComponent(interest.name)}`}
              aria-label={`${interest.name}, ${count} ${count === 1 ? 'member' : 'members'}`}
              aria-current={isActive ? 'page' : undefined}
              className={clsx(
                'inline-flex items-center border text-sm sm:text-base transition-colors rounded-full px-2 pt-0 pb-0.5 pr-1 shadow-sm',
                'transition-all translate-y-0 active:translate-y-0.5 active:inset-shadow-sm active:shadow-none',
                isActive
                  ? 'bg-primary/80 text-white dark:bg-primary-dark border-primary'
                  : 'bg-white hover:border-primary/50 dark:bg-white/15 text-foreground border-transparent',
              )}
            >
              {interest.name}
              <span
                aria-hidden
                className={clsx(
                  'font-medium ml-1.5 size-4 sm:size-5 inline-flex items-center justify-center rounded-full text-xs mt-px',
                  'inset-shadow-[0_1px_1px_0px_rgba(0,0,0,0.15)]',
                  isActive
                    ? 'bg-black/30 dark:bg-black/50 text-white border-primary'
                    : 'bg-black/10 dark:bg-background/50 dark:text-white',
                )}
              >
                {count}
              </span>
            </Link>
          </Fragment>
        );
      })}
    </div>
  );
}
