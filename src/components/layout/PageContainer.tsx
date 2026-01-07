import { ReactNode } from 'react';
import clsx from 'clsx';

type PageContainerProps = {
  children: ReactNode
  className?: string
  /** Use alternate background color */
  variant?: 'default' | 'alt'
  innerClassName?: string
}

// Shared padding used across all pages
export const pagePadding = 'px-3 py-6 sm:p-12 sm:pb-14';
export const pagePaddingAlt = 'px-4 pb-5 pt-4 sm:p-10 sm:pt-8';

export default function PageContainer({ children, className, variant = 'default', innerClassName }: PageContainerProps) {
  return (
    <div className={clsx(
      'flex grow justify-center',
      variant === 'alt' ? pagePaddingAlt : pagePadding,
      variant === 'alt' && 'bg-background-light',
      className,
    )}>
      <div className={clsx("w-full max-w-screen-md", innerClassName)}>
        {children}
      </div>
    </div>
  );
}
