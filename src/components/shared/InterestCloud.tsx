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
      className={clsx('flex flex-wrap items-baseline gap-y-1', className)}
    >
      {interests.map((interest, index) => {
        const isActive = activeInterest === interest.name;
        const count = interest.count || 0;

        return (
          <Fragment
            key={interest.id}
          >
            {index > 0 && (
              <span
                className="mx-2 sm:mx-2.5 opacity-50"
                aria-hidden
              >
                ·
              </span>
            )}
            <Link
              href={`/members/interest/${encodeURIComponent(interest.name)}`}
              className={clsx(
                'text-sm sm:text-base transition-colors',
                isActive
                  ? 'text-primary border-b border-primary'
                  : 'text-foreground/80 hover:text-primary',
              )}
            >
              {interest.name}
              <sup
                className="ml-1"
              >
                {count}
              </sup>
            </Link>
          </Fragment>
        );
      })}
    </div>
  );
}
