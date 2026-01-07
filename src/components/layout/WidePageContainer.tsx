import { ReactNode } from 'react';
import clsx from 'clsx';
import { pagePadding } from './PageContainer';

type WidePageContainerProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
};

/**
 * Wide page container for photo management pages
 * Uses max-w-screen-xl (1280px) instead of max-w-screen-md
 */
export default function WidePageContainer({
  children,
  className,
  innerClassName,
}: WidePageContainerProps) {
  return (
    <div className={clsx('flex grow justify-center', pagePadding, className)}>
      <div className={clsx('w-full max-w-screen-xl', innerClassName)}>
        {children}
      </div>
    </div>
  );
}

