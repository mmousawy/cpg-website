'use client';

import clsx from 'clsx';
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { useMounted } from '@/hooks/useMounted';

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
 * Custom select dropdown without body scroll lock.
 * Uses a portaled menu so it works inside scrollable modals.
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
    forwardedRef,
  ) => {
    const [open, setOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
    const triggerRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const mounted = useMounted();
    const listboxId = useId();

    const selectedOption = options.find((option) => option.value === value);

    const setTriggerRef = useCallback(
      (node: HTMLButtonElement | null) => {
        triggerRef.current = node;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef],
    );

    const updateMenuPosition = useCallback(() => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 50,
      });
    }, []);

    useLayoutEffect(() => {
      if (!open) return;

      updateMenuPosition();
      window.addEventListener('resize', updateMenuPosition);
      window.addEventListener('scroll', updateMenuPosition, true);

      return () => {
        window.removeEventListener('resize', updateMenuPosition);
        window.removeEventListener('scroll', updateMenuPosition, true);
      };
    }, [open, updateMenuPosition]);

    useEffect(() => {
      if (!open) return;
      listRef.current?.focus({ preventScroll: true });
    }, [open]);

    useEffect(() => {
      if (!open) return;

      const handlePointerDown = (event: MouseEvent) => {
        const target = event.target as Node;
        if (triggerRef.current?.contains(target)) return;
        if (listRef.current?.contains(target)) return;
        setOpen(false);
      };

      document.addEventListener('mousedown', handlePointerDown);
      return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [open]);

    const handleSelect = (optionValue: string) => {
      onValueChange(optionValue);
      setOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    };

    const handleTriggerClick = () => {
      if (disabled) return;
      setOpen((current) => !current);
    };

    const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;

      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setOpen(true);
      }

      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    const handleListKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
      const currentIndex = options.findIndex((option) => option.value === value);
      const enabledOptions = options.map((option, index) => ({ option, index }));

      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus({ preventScroll: true });
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const next = enabledOptions.find(({ index }) => index > currentIndex) ?? enabledOptions[0];
        if (next) handleSelect(next.option.value);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        const previous = [...enabledOptions].reverse().find(({ index }) => index < currentIndex)
          ?? enabledOptions[enabledOptions.length - 1];
        if (previous) handleSelect(previous.option.value);
      }
    };

    const triggerClasses = clsx(
      'inline-flex items-center justify-between gap-2 rounded border bg-background-medium px-3 py-[7px] text-sm',
      'transition-colors focus-visible:border-primary focus-visible:outline-none',
      fullWidth && 'w-full',
      error ? 'border-red-500' : 'border-border-color-strong',
      disabled && 'bg-background/50 text-foreground/50 cursor-not-allowed',
      mono && 'font-mono',
      !disabled && 'hover:bg-background-light',
      className,
    );

    const menu = open && mounted ? createPortal(
      <ul
        ref={listRef}
        id={listboxId}
        role="listbox"
        tabIndex={-1}
        style={menuStyle}
        onKeyDown={handleListKeyDown}
        className={clsx(
          'max-h-60 overflow-y-auto rounded-md border border-border-color bg-background p-1 shadow-lg font-sans',
        )}
      >
        {options.map((option) => {
          const isSelected = option.value === value;

          return (
            <li
              key={option.value}
              role="presentation"
            >
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(option.value)}
                className={clsx(
                  'relative flex w-full cursor-pointer select-none items-center gap-2 rounded-xs px-2 py-1.5 text-left text-sm',
                  'outline-none transition-colors hover:bg-foreground/5',
                  isSelected && 'bg-primary/10 text-primary',
                )}
              >
                {option.icon && (
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/80 dark:bg-black/40 [&_svg]:size-5"
                  >
                    {option.icon}
                  </span>
                )}
                <span
                  className="min-w-0 flex-1"
                >
                  {option.label}
                </span>
                {isSelected && (
                  <span
                    className="ml-2 flex shrink-0 items-center"
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
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>,
      document.body,
    ) : null;

    return (
      <>
        <button
          ref={setTriggerRef}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          onClick={handleTriggerClick}
          onKeyDown={handleTriggerKeyDown}
          className={triggerClasses}
        >
          <span
            className="flex min-w-0 flex-1 items-center gap-2"
          >
            {selectedOption?.icon && (
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/80 dark:bg-black/40 [&_svg]:size-5"
              >
                {selectedOption.icon}
              </span>
            )}
            <span
              className={clsx('truncate text-left', !selectedOption && 'text-foreground/60')}
            >
              {selectedOption?.label ?? placeholder}
            </span>
          </span>
          <span
            className="ml-2 text-foreground/80"
            aria-hidden
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
          </span>
        </button>
        {menu}
      </>
    );
  },
);

Select.displayName = 'Select';

export default Select;
