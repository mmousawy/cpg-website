import clsx from 'clsx';
import { ReactNode } from 'react';

// Shared padding used across all pages
export const pagePadding = 'px-4 py-6 md:p-12 md:pb-14';
export const pagePaddingAlt = 'px-4 pb-5 pt-4 md:p-10 md:pt-8';
export const pagePaddingFullWidth = 'py-6 md:p-12 md:pb-14';

type PageContainerVariant = 'default' | 'alt' | 'full-width';

type PageContainerProps = {
  children: ReactNode
  className?: string
  /** Use alternate background color */
  variant?: PageContainerVariant
  innerClassName?: string
}

export default function PageContainer({ children, className, variant = 'default', innerClassName }: PageContainerProps) {
  const paddingClass =
    variant === 'alt'
      ? pagePaddingAlt
      : variant === 'full-width'
        ? pagePaddingFullWidth
        : pagePadding;

  return (
    <div
      className={clsx(
        'flex justify-center',
        paddingClass,
        variant === 'alt' && 'bg-background-light',
        className,
      )}
    >
      <div
        className={clsx('w-full max-w-screen-md', innerClassName)}
      >
        {children}
      </div>
    </div>
  );
}
