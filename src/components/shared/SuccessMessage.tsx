import clsx from 'clsx';
import CheckAddSVG from 'public/icons/check-add.svg';

interface Props {
  children: React.ReactNode
  className?: string
  /** 'default' is larger/prominent (for RSVP flows), 'compact' is smaller (for forms) */
  variant?: 'default' | 'compact'
}

export default function SuccessMessage({ children, className = '', variant = 'default' }: Props) {
  return (
    <div className={clsx(
      'flex gap-2 rounded-md bg-[#00a86b20] text-foreground',
      variant === 'default' && 'p-4 text-[15px] font-semibold leading-6',
      variant === 'compact' && 'p-3 text-sm',
      className,
    )}>
      <CheckAddSVG className={clsx(
        'shrink-0 fill-foreground',
        variant === 'default' && 'size-6',
        variant === 'compact' && 'size-5',
      )} />
      <span>{children}</span>
    </div>
  );
}
