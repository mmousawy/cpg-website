'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import clsx from 'clsx';
import { forwardRef } from 'react';

export interface SelectProps {
  /** Current selected value */
  value: string;
  /** Callback when value changes */
  onValueChange: (value: string) => void;
  /** Select options */
  options: Array<{ value: string; label: string }>;
  /** Placeholder text */
  placeholder?: string;
  /** Error state - adds error border styling */
  error?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Full width select */
  fullWidth?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Custom Select component built on Radix UI Select.
 * Matches the styling of the Input component for consistency.
 *
 * @example
 * <Select
 *   value={filter}
 *   onValueChange={setFilter}
 *   options={[
 *     { value: 'all', label: 'All' },
 *     { value: 'active', label: 'Active' },
 *   ]}
 * />
 */
const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      value,
      onValueChange,
      options,
      placeholder = 'Select...',
      error = false,
      disabled = false,
      fullWidth = true,
      className,
    },
    ref,
  ) => {
    return (
      <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectPrimitive.Trigger
          ref={ref}
          className={clsx(
            // Base styles - matching Input component
            'inline-flex items-center justify-between rounded border bg-background px-3 py-2 text-sm font-[family-name:var(--font-geist-mono)]',
            'transition-colors focus:border-primary focus:outline-none',
            // Width
            fullWidth && 'w-full',
            // Border color
            error ? 'border-red-500' : 'border-border-color-strong',
            // Disabled state
            disabled && 'bg-background/50 text-foreground/50 cursor-not-allowed',
            // Hover state
            !disabled && 'hover:bg-background-light',
            // Additional classes
            className,
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon className="ml-2 text-foreground/80">
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2 4L6 8L10 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className={clsx(
              'z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border-color',
              'bg-background-light shadow-lg',
            )}
            position="popper"
            sideOffset={4}
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className={clsx(
                    'relative flex cursor-pointer select-none items-center rounded-xs px-2 py-1.5 text-sm font-[family-name:var(--font-geist-mono)]',
                    'outline-none transition-colors',
                    'focus:bg-primary/10 focus:text-primary',
                    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                  )}
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="absolute right-2 flex items-center">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10 3L4.5 8.5L2 6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    );
  },
);

Select.displayName = 'Select';

export default Select;
