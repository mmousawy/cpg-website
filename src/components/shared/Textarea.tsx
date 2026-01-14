import clsx from 'clsx';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';

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
      rows,
      value,
      onChange,
      ...props
    },
    ref,
  ) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);

    // Expose ref to parent component
    useImperativeHandle(ref, () => internalRef.current!, []);

    // Helper function to resize textarea
    const resizeTextarea = useCallback((textarea: HTMLTextAreaElement) => {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';

      // Calculate min height based on rows prop or default to 2 rows
      const minRows = rows || 2;
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
      const paddingTop = parseInt(getComputedStyle(textarea).paddingTop) || 0;
      const paddingBottom = parseInt(getComputedStyle(textarea).paddingBottom) || 0;
      const minHeight = minRows * lineHeight + paddingTop + paddingBottom;

      // Set height to scrollHeight, but not less than minHeight
      const newHeight = Math.max(textarea.scrollHeight, minHeight);
      textarea.style.height = `${newHeight}px`;
    }, [rows]);

    // Auto-resize when value or rows change
    useEffect(() => {
      const textarea = internalRef.current;
      if (!textarea) return;
      resizeTextarea(textarea);
    }, [value, rows, resizeTextarea]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      // Trigger resize
      resizeTextarea(e.target);

      // Call original onChange if provided
      onChange?.(e);
    };

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
        ref={internalRef}
        disabled={disabled}
        className={textareaClasses}
        rows={rows}
        value={value}
        onChange={handleChange}
        style={{ resize: 'none', overflow: 'hidden' }}
        {...props}
      />
    );
  },
);

Textarea.displayName = 'Textarea';

export default Textarea;
