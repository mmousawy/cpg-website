import clsx from 'clsx';
import { ReactNode } from 'react';

type PageContainerProps = {
  children: ReactNode
  className?: string
  /** Use alternate background color */
  variant?: 'default' | 'alt'
  innerClassName?: string
}

// Shared padding used across all pages
export const pagePadding = 'px-3 py-6 md:p-12 md:pb-14';
export const pagePaddingAlt = 'px-4 pb-5 pt-4 md:p-10 md:pt-8';

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
