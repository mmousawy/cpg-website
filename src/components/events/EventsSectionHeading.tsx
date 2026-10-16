'use client';

import clsx from 'clsx';
import type { ReactNode } from 'react';

import StickySectionHeading from '@/components/layout/StickySectionHeading';

type EventsSectionHeadingProps = {
  children: ReactNode;
  className?: string;
};

export default function EventsSectionHeading({ children, className }: EventsSectionHeadingProps) {
  return (
    <StickySectionHeading
      pinDesktop
      className={clsx('text-foreground', className)}
    >
      {children}
    </StickySectionHeading>
  );
}
