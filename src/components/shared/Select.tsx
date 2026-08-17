'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import clsx from 'clsx';
import { forwardRef } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  /** Optional leading element (e.g. icon) */
  icon?: React.ReactNode;
}

export interface SelectProps {
  /** Current selected value */
  value: string;
  /** Callback when value changes */
  onValueChange: (value: string) => void;
  /** Select options */
  options: Array<SelectOption>;
  /** Placeholder text */
  placeholder?: string;
  /** Error state - adds error border styling */
  error?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Full width select */
  fullWidth?: boolean;
  /** Use monospace font */
  mono?: boolean;
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
      mono = false,
      className,
    },
    ref,
  ) => {
    return (
      <SelectPrimitive.Root
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          ref={ref}
          className={clsx(
            // Base styles - matching Input component
            'inline-flex items-center justify-between gap-2 rounded border bg-background-medium px-3 py-[7px] text-sm',
            'transition-colors focus-visible:border-primary focus-visible:outline-none',
            // Width
            fullWidth && 'w-full',
            // Border color
            error ? 'border-red-500' : 'border-border-color-strong',
            // Disabled state
            disabled && 'bg-background/50 text-foreground/50 cursor-not-allowed',
            // Monospace font
            mono && 'font-mono',
            // Hover state
            !disabled && 'hover:bg-background-light',
            // Additional classes
            className,
          )}
        >
          <span
            className="flex min-w-0 flex-1 items-center gap-2"
          >
            {(() => {
              const selected = options.find((o) => o.value === value);
              return selected?.icon ? (
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/80 dark:bg-black/40 [&_svg]:size-5"
                >
                  {selected.icon}
                </span>
              ) : null;
            })()}
            <SelectPrimitive.Value
              placeholder={placeholder}
            />
          </span>
          <SelectPrimitive.Icon
            className="ml-2 text-foreground/80"
          >
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
              'z-50 min-w-(--radix-select-trigger-width) overflow-hidden rounded-md border border-border-color',
              'bg-background-light shadow-lg font-sans',
            )}
            position="popper"
            sideOffset={4}
          >
            <SelectPrimitive.Viewport
              className="p-1"
            >
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className={clsx(
                    'relative flex cursor-pointer select-none items-center gap-2 rounded-xs px-2 py-1.5 text-sm',
                    'outline-none transition-colors',
                    'hover:bg-foreground/5 data-highlighted:bg-foreground/5',
                    'data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary',
                    'data-disabled:pointer-events-none data-disabled:opacity-50',
                  )}
                >
                  {option.icon && (
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/80 dark:bg-black/40 [&_svg]:size-5"
                    >
                      {option.icon}
                    </span>
                  )}
                  <SelectPrimitive.ItemText>
                    {option.label}
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator
                    className="absolute right-2 flex items-center"
                  >
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
