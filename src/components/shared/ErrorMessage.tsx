import clsx from 'clsx';
import ErrorSVG from 'public/icons/error.svg';

interface Props {
  children: React.ReactNode
  className?: string
  /** 'default' is larger/prominent (for RSVP flows), 'compact' is smaller (for forms) */
  variant?: 'default' | 'compact'
}

export default function ErrorMessage({ children, className = '', variant = 'default' }: Props) {
  return (
    <div
      className={clsx(
        'flex gap-2 rounded-md bg-[#c5012c20] text-error-red',
        variant === 'default' && 'p-4 text-[15px] font-semibold leading-6',
        variant === 'compact' && 'p-3 text-sm',
        className,
      )}
    >
      <ErrorSVG
        className={clsx(
          'shrink-0 fill-error-red',
          variant === 'default' && 'size-6',
          variant === 'compact' && 'size-5',
        )}
      />
      <span>
        {children}
      </span>
    </div>
  );
}
