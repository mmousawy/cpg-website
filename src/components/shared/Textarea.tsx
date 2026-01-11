import clsx from 'clsx';
import { forwardRef } from 'react';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Error state - adds error border styling */
  error?: boolean;
  /** Full width textarea */
  fullWidth?: boolean;
}

/**
 * Unified Textarea component for multi-line text inputs.
 *
 * Works with react-hook-form's register() function.
 *
 * @example
 * // Basic usage
 * <Textarea placeholder="Enter description..." rows={4} />
 *
 * @example
 * // With react-hook-form
 * <Textarea {...register('description')} error={!!errors.description} rows={4} />
 *
 * @example
 * // With error state
 * <Textarea error={!!errors.bio} {...register('bio')} rows={4} />
 */
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      error = false,
      fullWidth = true,
      disabled,
      ...props
    },
    ref,
  ) => {
    const textareaClasses = clsx(
      // Base styles
      'rounded border border-border-color-strong bg-background-medium px-3 py-2 text-sm transition-colors',
      'focus:border-primary focus:outline-none',
      // Width
      fullWidth && 'w-full',
      // Border color
      error ? 'border-red-500' : 'border-border-color',
      // Disabled state
      disabled && 'bg-background/50 text-foreground/50 cursor-not-allowed',
      // Additional classes
      className,
    );

    return (
      <textarea
        ref={ref}
        disabled={disabled}
        className={textareaClasses}
        {...props}
      />
    );
  },
);

Textarea.displayName = 'Textarea';

export default Textarea;
