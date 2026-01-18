'use client';

import type { Interest } from '@/types/interests';
import clsx from 'clsx';
import Link from 'next/link';

interface InterestCloudProps {
  interests: Interest[];
  /** Currently active interest (if on an interest page) */
  activeInterest?: string;
  className?: string;
}

/**
 * Interest cloud showing interests with size based on usage count
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

  // Calculate size classes based on count relative to max
  const maxCount = Math.max(...interests.map((i) => i.count || 0));
  const minCount = Math.min(...interests.map((i) => i.count || 0));
  const range = maxCount - minCount || 1;

  function getSizeClass(count: number): string {
    const normalized = (count - minCount) / range;

    if (normalized > 0.8) return 'text-lg font-semibold';
    if (normalized > 0.6) return 'text-base font-medium';
    if (normalized > 0.4) return 'text-sm font-medium';
    if (normalized > 0.2) return 'text-sm font-medium';
    return 'text-sm';
  }

  return (
    <div
      className={clsx('flex flex-wrap items-center gap-2', className)}
    >
      {interests.map((interest) => {
        const isActive = activeInterest === interest.name;
        const count = interest.count || 0;

        return (
          <Link
            key={interest.id}
            href={`/members/interest/${encodeURIComponent(interest.name)}`}
            className={clsx(
              'border-border-color-strong bg-background-light inline-flex items-center gap-2 rounded-full border px-3 py-2 leading-none transition-colors',
              'hover:border-primary hover:text-primary',
              getSizeClass(count),
              isActive
                ? 'border-primary bg-primary text-white'
                : 'border-border-color-strong bg-background-light hover:border-primary hover:text-primary',
            )}
          >
            <span
              className="-mt-[0.15em] leading-none font-medium"
            >
              {interest.name}
            </span>
            <span
              className={clsx('text-[0.75em] leading-none opacity-60', isActive && 'opacity-80')}
            >
              {count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
