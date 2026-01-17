'use client';

import type { Tag as TagType } from '@/types/photos';
import clsx from 'clsx';
import Link from 'next/link';
import Tag from './Tag';

interface TagCloudProps {
  tags: TagType[];
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

  // Calculate size based on count relative to max
  const maxCount = Math.max(...tags.map((t) => t.count || 0));
  const minCount = Math.min(...tags.map((t) => t.count || 0));
  const range = maxCount - minCount || 1;

  function getSize(count: number): 'xs' | 'sm' | 'base' | 'lg' {
    const normalized = (count - minCount) / range;

    if (normalized > 0.8) return 'lg';
    if (normalized > 0.6) return 'base';
    if (normalized > 0.3) return 'sm';
    return 'xs';
  }

  return (
    <div className={clsx('flex flex-wrap gap-2 items-center', className)}>
      {tags.map((tag) => {
        const isActive = activeTag === tag.name;

        return (
          <Link
            key={tag.id}
            href={`/gallery/tag/${encodeURIComponent(tag.name)}`}
            className="group"
          >
            <Tag
              text={tag.name}
              count={tag.count || 0}
              size={getSize(tag.count || 0)}
              isActive={isActive}
            />
          </Link>
        );
      })}
    </div>
  );
}
