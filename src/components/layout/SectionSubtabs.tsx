'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type SectionSubtabItem = {
  href: string;
  label: string;
};

type SectionSubtabsProps = {
  items: SectionSubtabItem[];
  className?: string;
};

export default function SectionSubtabs({ items, className }: SectionSubtabsProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Section"
      className={clsx(
        'inline-flex max-w-full shrink-0 rounded-full border border-border-color bg-background-medium p-0.5',
        className,
      )}
    >
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            aria-current={active ? 'page' : undefined}
            className={clsx(
              'whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium transition-colors sm:px-3 sm:py-1 sm:text-sm',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground/70 hover:text-foreground',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
