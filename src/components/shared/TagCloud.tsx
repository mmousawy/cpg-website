'use client';

import type { Tag } from '@/types/photos';
import clsx from 'clsx';
import Link from 'next/link';

interface TagCloudProps {
  tags: Tag[];
  /** Currently active tag (if on a tag page) */
  activeTag?: string;
  className?: string;
}

/**
 * Tag cloud showing popular tags with size based on usage count
 * Tags link to /gallery/tag/<tagname>
 */
export default function TagCloud({ tags, activeTag, className }: TagCloudProps) {
  if (tags.length === 0) {
    return null;
  }

  // Calculate size classes based on count relative to max
  const maxCount = Math.max(...tags.map((t) => t.count || 0));
  const minCount = Math.min(...tags.map((t) => t.count || 0));
  const range = maxCount - minCount || 1;

  function getSizeClass(count: number): string {
    const normalized = (count - minCount) / range;

    if (normalized > 0.8) return 'text-lg font-semibold';
    if (normalized > 0.6) return 'text-base font-medium';
    if (normalized > 0.4) return 'text-sm font-medium';
    if (normalized > 0.2) return 'text-sm';
    return 'text-xs';
  }

  return (
    <div className={clsx('flex flex-wrap gap-2 items-center', className)}>
      {tags.map((tag) => {
        const isActive = activeTag === tag.name;

        return (
          <Link
            key={tag.id}
            href={`/gallery/tag/${encodeURIComponent(tag.name)}`}
            className={clsx(
              'inline-flex items-center gap-[0.5em] rounded-full border px-[1em] py-[.75em] leading-none transition-colors',
              getSizeClass(tag.count || 0),
              isActive
                ? 'border-primary bg-primary text-white'
                : 'border-border-color bg-background-light hover:border-primary hover:text-primary',
            )}
          >
            <span className="leading-none -mt-[0.15em] font-medium">{tag.name}</span>
            <span className={clsx(
              'text-[0.75em] leading-none opacity-60',
              isActive && 'opacity-80',
            )}>
              {tag.count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
