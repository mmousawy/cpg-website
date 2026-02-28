import clsx from 'clsx';
import { forwardRef } from 'react';

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Error state - adds error border styling */
  error?: boolean;
  /** Left addon element (e.g., @ symbol, icon) */
  leftAddon?: React.ReactNode;
  /** Right addon element (e.g., validation icon, button) */
  rightAddon?: React.ReactNode;
  /** Use monospace font (useful for slugs, codes) */
  mono?: boolean;
  /** Full width input */
  fullWidth?: boolean;
}

/**
 * Unified Input component for single-line text inputs.
 * Supports types: text, email, url, number, password, search, tel, date, time
 *
 * Works with react-hook-form's register() function.
 *
 * @example
 * // Basic usage
 * <Input type="email" placeholder="you@example.com" />
 *
 * @example
 * // With react-hook-form
 * <Input {...register('email')} type="email" error={!!errors.email} />
 *
 * @example
 * // With left addon (prefix)
 * <Input leftAddon="@" placeholder="username" />
 *
 * @example
 * // With error state
 * <Input error={!!errors.title} {...register('title')} />
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      error = false,
      leftAddon,
      rightAddon,
      mono = false,
      fullWidth = true,
      disabled,
      ...props
    },
    ref,
  ) => {
    const hasAddons = leftAddon || rightAddon;

    const inputClasses = clsx(
      // Base styles
      'rounded border border-border-color-strong bg-background-medium text-sm transition-colors',
      'focus-visible:border-primary focus-visible:outline-none',
      // Padding - adjusted when addons are present
      hasAddons ? 'py-2' : 'px-3 py-2',
      leftAddon && 'pl-8',
      rightAddon && 'pr-10',
      !leftAddon && hasAddons && 'pl-3',
      !rightAddon && hasAddons && 'pr-3',
      // Width
      fullWidth && 'w-full',
      // Border color
      error ? 'border-red-500' : 'border-border-color',
      // Disabled state
      disabled && 'bg-background/50 text-foreground/50 cursor-not-allowed',
      // Monospace font
      mono && 'font-mono',
      // Additional classes
      className,
    );

    // If there are addons, wrap in a relative container
    if (hasAddons) {
      return (
        <div
          className={clsx('relative', fullWidth && 'w-full')}
        >
          {leftAddon && (
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50"
            >
              {leftAddon}
            </span>
          )}
          <input
            ref={ref}
            type={type}
            disabled={disabled}
            className={inputClasses}
            {...props}
          />
          {rightAddon && (
            <div
              className="flex items-center absolute right-3 top-1/2 -translate-y-1/2"
            >
              {rightAddon}
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        ref={ref}
        type={type}
        disabled={disabled}
        className={inputClasses}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';

export default Input;
