'use client';

import clsx from 'clsx';
import { forwardRef } from 'react';

interface ToggleProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Label for the left side (unchecked state) */
  leftLabel: string;
  /** Label for the right side (checked state) */
  rightLabel: string;
  /** Optional label displayed above the toggle */
  label?: string;
}

/**
 * A reusable toggle switch with labels on each side.
 * - Unchecked: Left side is active (full opacity)
 * - Checked: Right side is active (full opacity)
 *
 * The inactive side is displayed with reduced opacity.
 * Works with react-hook-form's register() function.
 */
const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, leftLabel, rightLabel, label, id, ...props }, ref) => {
    return (
      <div className={clsx('flex flex-col gap-2', className)}>
        {label && (
          <span className="text-sm font-medium">{label}</span>
        )}
        <label
          htmlFor={id}
          className="group flex cursor-pointer items-center gap-3"
        >
          {/* Hidden checkbox - placed first so peer selectors work for all siblings */}
          <input
            ref={ref}
            type="checkbox"
            id={id}
            className="peer sr-only"
            aria-label={`Toggle ${leftLabel} and ${rightLabel}`}
            {...props}
          />

          {/* Left label (active when unchecked) */}
          <span className="text-sm font-medium text-foreground transition-colors peer-checked:text-foreground/40">
            {leftLabel}
          </span>

          {/* Toggle track */}
          <span
            className={clsx(
              'relative h-6 w-11 rounded-full transition-colors',
              'bg-foreground/20 peer-checked:bg-primary',
            )}
          >
            {/* Toggle knob - uses group-has since it's nested and can't use peer directly */}
            <span
              className={clsx(
                'absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform',
                'group-has-[input:checked]:translate-x-5',
              )}
            />
          </span>

          {/* Right label (active when checked) */}
          <span className="text-sm font-medium text-foreground/40 transition-colors peer-checked:text-foreground">
            {rightLabel}
          </span>
        </label>
      </div>
    );
  },
);

Toggle.displayName = 'Toggle';

export default Toggle;
