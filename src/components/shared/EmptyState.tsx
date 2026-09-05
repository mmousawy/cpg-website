import clsx from 'clsx';
import type { ReactNode } from 'react';

type EmptyStateProps = {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'border-2 border-dashed border-border-color rounded-md p-6 sm:p-8 text-center flex flex-col items-center justify-center',
        className,
      )}
    >
      {icon && (
        <div
          className="mb-2"
        >
          {icon}
        </div>
      )}
      <p
        className={clsx(
          'text-lg opacity-70',
          description ? 'mb-2' : action ? 'mb-4' : 'mb-2',
        )}
      >
        {title}
      </p>
      {description && (
        <p
          className={clsx(
            'text-sm text-foreground/50',
            action && 'mb-4',
          )}
        >
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
