// Move to shared/Button.tsx
import clsx from 'clsx';
import Link from 'next/link';
import { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'custom';
type ButtonSize = 'sm' | 'md';

type BaseButtonProps = {
  /**
   * Visual style variant
   * @default 'primary'
   */
  variant?: ButtonVariant;
  /**
   * Size of the button
   * @default 'md'
   */
  size?: ButtonSize;
  /**
   * Whether button should take full width
   * @default false
   */
  fullWidth?: boolean;
  /**
   * Show loading spinner and disable button
   * @default false
   */
  loading?: boolean;
  /**
   * Icon to display before the text
   */
  icon?: ReactNode;
  /**
   * Icon to display after the text
   */
  iconRight?: ReactNode;
  /**
   * Button content
   */
  children: ReactNode;
};

type ButtonAsButton = BaseButtonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseButtonProps> & {
    href?: never;
  };

type ButtonAsLink = BaseButtonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseButtonProps> & {
    href: string;
  };

type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white border-primary hover:bg-primary-alt hover:text-slate-950 hover:border-primary-alt focus-visible:bg-primary-alt focus-visible:text-slate-950 focus-visible:border-primary-alt',
  secondary:
    'bg-background border-border-color-strong text-foreground hover:border-primary hover:bg-primary/5 focus-visible:border-primary focus-visible:bg-primary/5',
  danger:
    'bg-background border-red-500/30 text-red-500 hover:border-red-500 hover:bg-red-500/10 focus-visible:border-red-500 focus-visible:bg-red-500/10',
  ghost:
    'bg-transparent border-transparent text-foreground hover:bg-background focus-visible:bg-background',
  custom:
    '',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
};

export default function Button({
  variant = 'primary',
  size = 'sm',
  fullWidth = false,
  loading = false,
  icon,
  iconRight,
  children,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = loading || ('disabled' in props && props.disabled);
  
  const classes = clsx(
    // Base styles
    'group inline-flex items-center justify-center gap-2 rounded-full border font-[family-name:var(--font-geist-mono)] font-medium transition-colors whitespace-nowrap',
    // Variant styles
    variantStyles[variant],
    // Size styles
    sizeStyles[size],
    // Width
    fullWidth && 'w-full',
    // Disabled/loading state
    isDisabled && 'cursor-not-allowed opacity-50',
    // Custom className
    className
  );

  const LoadingSpinner = () => (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );

  const content = (
    <>
      {loading ? (
        <LoadingSpinner />
      ) : (
        icon && <span className="inline-flex shrink-0 [&_svg:not([data-no-inherit])]:fill-current [&_svg[fill=none]]:fill-none [&_svg[stroke]]:stroke-current">{icon}</span>
      )}
      {children}
      {!loading && iconRight && <span className="inline-flex shrink-0 [&_svg:not([data-no-inherit])]:fill-current [&_svg[fill=none]]:fill-none [&_svg[stroke]]:stroke-current">{iconRight}</span>}
    </>
  );

  if ('href' in props && props.href) {
    const { href, ...linkProps } = props as ButtonAsLink;
    return (
      <Link href={href} className={classes} {...linkProps}>
        {content}
      </Link>
    );
  }

  const buttonProps = props as ButtonAsButton;
  return (
    <button className={classes} disabled={isDisabled} {...buttonProps}>
      {content}
    </button>
  );
}
