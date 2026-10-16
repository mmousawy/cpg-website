import Link from 'next/link';
import type { ReactNode } from 'react';

import StickySectionHeading from '@/components/layout/StickySectionHeading';

type GalleryLinkedSectionHeadingProps = {
  href: string;
  title: string;
  description: ReactNode;
};

/** Gallery home section title — sticky wrapper must sit above the grid, not inside it. */
export function GalleryLinkedSectionHeading({
  href,
  title,
  description,
}: GalleryLinkedSectionHeadingProps) {
  return (
    <StickySectionHeading
      as="div"
      stickyClassName="mb-6 sm:mb-6"
    >
      <Link
        href={href}
        className="group"
      >
        <h2
          className="inline-block text-xl font-semibold group-hover:text-primary transition-colors font-heading"
        >
          {title}
        </h2>
      </Link>
      <p
        className="text-sm text-foreground/80 leading-snug"
      >
        {description}
      </p>
    </StickySectionHeading>
  );
}
