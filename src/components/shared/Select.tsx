'use client';

import { PORTAL_OVERLAY_ATTR } from '@/lib/focusTrapPortals';
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

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

/**
 * Select menu without Radix RemoveScroll (avoids page/modal scroll jumps on open).
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
    const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const listboxId = useId();

    const selected = options.find((o) => o.value === value);

    const setRefs = useCallback(
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
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }, []);

    useLayoutEffect(() => {
      if (!open) {
        setMenuPosition(null);
        return;
      }
      updateMenuPosition();
      const onLayoutChange = () => updateMenuPosition();
      window.addEventListener('resize', onLayoutChange);
      window.addEventListener('scroll', onLayoutChange, true);
      return () => {
        window.removeEventListener('resize', onLayoutChange);
        window.removeEventListener('scroll', onLayoutChange, true);
      };
    }, [open, updateMenuPosition]);

    useEffect(() => {
      if (!open) return;

      const onPointerDown = (event: MouseEvent) => {
        const target = event.target as Node;
        if (
          menuRef.current?.contains(target) ||
          triggerRef.current?.contains(target)
        ) {
          return;
        }
        setOpen(false);
      };

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setOpen(false);
          triggerRef.current?.focus({ preventScroll: true });
        }
      };

      document.addEventListener('mousedown', onPointerDown);
      document.addEventListener('keydown', onKeyDown);
      return () => {
        document.removeEventListener('mousedown', onPointerDown);
        document.removeEventListener('keydown', onKeyDown);
      };
    }, [open]);

    const handleSelect = (next: string) => {
      onValueChange(next);
      setOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    };

    const showMenu = open && menuPosition !== null;

    const menu = showMenu ? (
      <div
        ref={menuRef}
        {...{ [PORTAL_OVERLAY_ATTR]: '' }}
        id={listboxId}
        role="listbox"
        className={clsx(
          'fixed z-100 overflow-hidden rounded-md border border-border-color-strong',
          'bg-background-medium bg-no-noise font-sans shadow-lg shadow-black/15 ring-1 ring-black/5 dark:shadow-black/35 dark:ring-white/10',
        )}
        style={{
          top: menuPosition.top,
          left: menuPosition.left,
          width: menuPosition.width,
        }}
      >
        <ul
          className="max-h-60 overflow-y-auto p-1"
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
                  className={clsx(
                    'relative flex w-full cursor-pointer select-none items-center gap-2 rounded-xs px-2 py-1.5 text-left text-sm outline-none transition-colors',
                    'hover:bg-background-light',
                    isSelected && 'bg-primary/10 text-primary dark:bg-foreground/5',
                    isSelected && 'shadow-[inset_0_0_0_1px_#38786052] dark:shadow-[inset_0_0_0_1px_#ededed1c]',
                  )}
                  onClick={() => handleSelect(option.value)}
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
                    <svg
                      className="size-3 shrink-0"
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden
                    >
                      <path
                        d="M10 3L4.5 8.5L2 6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    ) : null;

    return (
      <>
        <button
          ref={setRefs}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          className={clsx(
            'inline-flex items-center justify-between gap-2 rounded border bg-background-medium px-3 py-1.75 text-sm',
            'transition-colors focus-visible:border-primary focus-visible:outline-none',
            fullWidth && 'w-full',
            error ? 'border-red-500' : 'border-border-color-strong',
            disabled && 'bg-background/50 text-foreground/50 cursor-not-allowed',
            mono && 'font-mono',
            !disabled && 'hover:bg-background-light',
            className,
          )}
          onClick={() => {
            if (disabled) return;
            setOpen((prev) => !prev);
          }}
        >
          <span
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            {selected?.icon && (
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/80 dark:bg-black/40 [&_svg]:size-5"
              >
                {selected.icon}
              </span>
            )}
            <span
              className={clsx('truncate', !selected && 'text-foreground/50')}
            >
              {selected?.label ?? placeholder}
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
        {typeof document !== 'undefined' && menu && createPortal(menu, document.body)}
      </>
    );
  },
);

Select.displayName = 'Select';

export default Select;
