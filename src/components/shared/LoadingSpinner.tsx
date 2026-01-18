import clsx from 'clsx';

interface LoadingSpinnerProps {
  /**
   * Size of the spinner
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Whether to center the spinner in its container
   * @default false
   */
  centered?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export default function LoadingSpinner({ size = 'md', centered = false, className }: LoadingSpinnerProps) {
  const spinner = (
    <div
      className={clsx(
        'animate-spin rounded-full border-2 border-primary border-t-transparent',
        sizeClasses[size],
        className,
      )}
    />
  );

  if (centered) {
    return (
      <div
        className="flex items-center justify-center py-12"
      >
        {spinner}
      </div>
    );
  }

  return spinner;
}
