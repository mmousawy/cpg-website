'use client';

import clsx from 'clsx';
import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

import DevWorkbenchNavMarker from './DevWorkbenchNavMarker';
import {
  devWorkbenchNavLinkClass,
  type DevWorkbenchNavLinkVariant,
} from './devWorkbenchNavLinkClass';

type DevWorkbenchNavItemLinkProps = Omit<ComponentProps<typeof Link>, 'className'> & {
  active: boolean;
  variant?: DevWorkbenchNavLinkVariant;
  className?: string;
  children: ReactNode;
  showMarker?: boolean;
};

export default function DevWorkbenchNavItemLink({
  active,
  variant = 'mono',
  className,
  children,
  showMarker = true,
  ...linkProps
}: DevWorkbenchNavItemLinkProps) {
  return (
    <Link
      {...linkProps}
      className={clsx(devWorkbenchNavLinkClass(active, variant), className)}
    >
      {showMarker ? (
        <DevWorkbenchNavMarker
          active={active}
        />
      ) : null}
      {children}
    </Link>
  );
}
