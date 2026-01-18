'use client';

import clsx from 'clsx';
import { forwardRef } from 'react';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  labelClassName?: string;
}

/**
 * Custom styled checkbox component.
 * - Unchecked: Subtle border, no color
 * - Checked: Primary color with checkmark
 *
 * Works with react-hook-form's register() function.
 */
const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, labelClassName, id, ...props }, ref) => {
    return (
      <label
        htmlFor={id}
        className={labelClassName}
      >
        <div
          className="relative"
        >
          <input
            ref={ref}
            type="checkbox"
            id={id}
            className={clsx(
              'block peer size-5 cursor-pointer appearance-none rounded border-2 transition-all',
              'border-border-color-strong bg-background',
              'checked:border-primary checked:bg-primary',
              'focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none',
              className,
            )}
            {...props}
          />
          {/* Checkmark overlay - positioned over the input */}
          <svg
            className="pointer-events-none absolute top-0.5 left-0.5 size-4 text-white opacity-0 transition-opacity peer-checked:opacity-100"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        {label && <span
          className="text-sm"
        >
          {label}
        </span>}
      </label>
    );
  },
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
