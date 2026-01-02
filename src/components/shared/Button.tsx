// Move to shared/Button.tsx
import clsx from 'clsx';
import { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'custom';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
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
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white border-primary hover:bg-primary-alt hover:text-slate-950 hover:border-primary-alt',
  secondary:
    'bg-background border-border-color-strong text-foreground hover:border-primary hover:bg-primary/5',
  danger:
    'bg-background border-red-500/30 text-red-500 hover:border-red-500 hover:bg-red-500/10',
  ghost:
    'bg-transparent border-transparent text-foreground hover:bg-background',
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
  icon,
  iconRight,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        // Base styles
        'inline-flex items-center justify-center gap-2 rounded-full border font-[family-name:var(--font-geist-mono)] font-medium transition-colors whitespace-nowrap',
        // Variant styles
        variantStyles[variant],
        // Size styles
        sizeStyles[size],
        // Width
        fullWidth && 'w-full',
        // Disabled state
        disabled && 'cursor-not-allowed opacity-50',
        // Custom className
        className
      )}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0 [&_svg]:fill-current [&_svg[fill=none]]:fill-none [&_svg]:stroke-current">{icon}</span>}
      {children}
      {iconRight && <span className="inline-flex shrink-0 [&_svg]:fill-current [&_svg[fill=none]]:fill-none [&_svg]:stroke-current">{iconRight}</span>}
    </button>
  );
}
