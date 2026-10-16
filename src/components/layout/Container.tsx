import clsx from 'clsx';
import { ReactNode } from 'react';

import { mobileBleedCardClassName } from '@/components/layout/mobileChrome';

type ContainerProps = {
  children: ReactNode
  className?: string
  variant?: 'default' | 'centered' | 'form' | 'gradient'
  padding?: 'sm' | 'md' | 'lg'
  id?: string
}

export default function Container({
  children,
  className,
  variant = 'default',
  padding = 'md',
  id,
}: ContainerProps) {
  const baseStyles = 'rounded-xl md:rounded-2xl fill-foreground text-foreground shadow-lg shadow-[#00000007]';

  const paddingStyles = {
    sm: 'max-sm:px-3 max-sm:py-4 sm:p-4',
    md: 'p-6 max-sm:px-3 max-sm:py-4',
    lg: 'p-8 max-sm:px-3 max-sm:py-6',
  };

  const variantStyles = {
    default: 'border-[0.0625rem] border-border-color bg-background-light',
    centered: 'border-[0.0625rem] border-border-color bg-background-light flex min-h-28 justify-center items-center',
    form: 'border-[0.0625rem] border-border-color bg-background-light',
    gradient: 'container-gradient',
  };

  return (
    <div
      id={id}
      className={clsx(
        baseStyles,
        mobileBleedCardClassName,
        paddingStyles[padding],
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}
