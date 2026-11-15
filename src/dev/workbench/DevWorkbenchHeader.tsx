'use client';

import type { ReactNode } from 'react';

type DevWorkbenchHeaderProps = {
  title: string;
  subtitle?: ReactNode;
  trailing?: ReactNode;
};

export default function DevWorkbenchHeader({
  title,
  subtitle,
  trailing,
}: DevWorkbenchHeaderProps) {
  return (
    <header
      className="flex shrink-0 items-center justify-between gap-4 border-b border-border-color bg-background-light px-4 py-2"
    >
      <div
        className="min-w-0"
      >
        <p
          className="font-heading text-base font-bold"
        >
          {title}
        </p>
        {subtitle ? (
          <p
            className="text-xs text-foreground/60"
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {trailing}
    </header>
  );
}
