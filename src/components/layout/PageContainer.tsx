import { ReactNode } from 'react'
import clsx from 'clsx'

type PageContainerProps = {
  children: ReactNode
  className?: string
  /** Use alternate background color */
  variant?: 'default' | 'alt'
}

// Shared padding used across all pages
export const pagePadding = 'px-4 pb-8 pt-6 sm:p-12 sm:pb-14';
export const pagePaddingAlt = 'px-4 pb-5 pt-4 sm:p-10 sm:pt-8';

export default function PageContainer({ children, className, variant = 'default' }: PageContainerProps) {
  return (
    <div className={clsx(
      'flex grow justify-center',
      variant === 'alt' ? pagePaddingAlt : pagePadding,
      variant === 'alt' && 'bg-background-light',
      className
    )}>
      <div className="w-full max-w-screen-md">
        {children}
      </div>
    </div>
  )
}
