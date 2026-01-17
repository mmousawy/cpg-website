'use client';

import clsx from 'clsx';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';

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
  ({ className, leftLabel, rightLabel, label, id, onChange, ...props }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);

    // Forward the ref
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    // Handle click on the toggle area
    const handleToggleClick = useCallback(() => {
      if (inputRef.current && !props.disabled) {
        inputRef.current.click();
      }
    }, [props.disabled]);

    return (
      <div className={clsx('flex flex-col gap-2', className)}>
        {label && <span className="text-sm font-medium">{label}</span>}
        <div className="group flex items-center gap-3">
          {/* Hidden checkbox */}
          <input
            ref={inputRef}
            type="checkbox"
            id={id}
            className="peer sr-only"
            aria-label={`Toggle ${leftLabel} and ${rightLabel}`}
            onChange={onChange}
            {...props}
          />

          {/* Left label (active when unchecked) */}
          <button
            type="button"
            onClick={handleToggleClick}
            className="text-foreground peer-checked:text-foreground/40 cursor-pointer text-sm font-medium transition-colors"
            tabIndex={-1}
          >
            {leftLabel}
          </button>

          {/* Toggle track - now directly clickable */}
          <button
            type="button"
            onClick={handleToggleClick}
            className={clsx(
              'relative h-6 w-11 cursor-pointer rounded-full transition-colors',
              'bg-foreground/20 peer-checked:bg-primary',
            )}
            tabIndex={-1}
            aria-hidden="true"
          >
            {/* Toggle knob */}
            <span
              className={clsx(
                'pointer-events-none absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform',
                'group-has-[input:checked]:translate-x-5',
              )}
            />
          </button>

          {/* Right label (active when checked) */}
          <button
            type="button"
            onClick={handleToggleClick}
            className="text-foreground/40 peer-checked:text-foreground cursor-pointer text-sm font-medium transition-colors"
            tabIndex={-1}
          >
            {rightLabel}
          </button>
        </div>
      </div>
    );
  },
);

Toggle.displayName = 'Toggle';

export default Toggle;
