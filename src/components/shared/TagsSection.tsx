'use client';

import type { SimpleTag } from '@/types/photos';
import clsx from 'clsx';
import Link from 'next/link';
import Tag from './Tag';

interface TagsSectionProps {
  tags: SimpleTag[];
  className?: string;
}

/**
 * Simple tags display section for photo/album detail pages.
 * Shows tags as clickable links to gallery tag pages.
 */
export default function TagsSection({ tags, className }: TagsSectionProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div
      className={clsx('mt-5 sm:mt-6', className)}
    >
      <p
        className="mb-2 text-sm font-medium"
      >
        Tags:
      </p>
      <div
        className="flex flex-wrap gap-2"
      >
        {tags.map((tagObj) => (
          <Link
            key={tagObj.tag}
            href={`/gallery/tag/${encodeURIComponent(tagObj.tag)}`}
            className="group"
          >
            <Tag
              text={tagObj.tag}
              size="sm"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
