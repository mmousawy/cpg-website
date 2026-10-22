'use client';

import { getOverlayPortalRoot, PORTAL_OVERLAY_ATTR } from '@/lib/focusTrapPortals';
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

function scrollChildIntoContainer(container: HTMLElement, child: HTMLElement) {
  const containerRect = container.getBoundingClientRect();
  const childRect = child.getBoundingClientRect();
  if (childRect.bottom > containerRect.bottom) {
    container.scrollTop += childRect.bottom - containerRect.bottom;
  } else if (childRect.top < containerRect.top) {
    container.scrollTop -= containerRect.top - childRect.top;
  }
}

function selectedIndexOf(options: Array<SelectOption>, value: string) {
  const index = options.findIndex((option) => option.value === value);
  return index >= 0 ? index : 0;
}

/**
 * Custom select that keeps focus on the trigger so arrow keys work inside
 * modal focus traps. Highlighted options are scrolled within the menu only.
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
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
    const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const listboxId = useId();

    const selected = options.find((o) => o.value === value);
    const highlighted = options[highlightedIndex];
    const highlightedOptionId =
      open && highlighted ? `${listboxId}-option-${highlightedIndex}` : undefined;

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

    const closeMenu = useCallback(() => {
      setOpen(false);
      setMenuPosition(null);
    }, []);

    const openMenu = useCallback(
      (highlight: 'selected' | 'first' | 'last' = 'selected') => {
        if (disabled || options.length === 0) return;
        const selectedIndex = selectedIndexOf(options, value);
        const nextIndex =
          highlight === 'first'
            ? 0
            : highlight === 'last'
              ? options.length - 1
              : selectedIndex;
        setHighlightedIndex(nextIndex);
        setPortalRoot(getOverlayPortalRoot(triggerRef.current) ?? document.body);
        setOpen(true);
      },
      [disabled, options, value],
    );

    const handleSelect = useCallback(
      (next: string) => {
        onValueChange(next);
        closeMenu();
        triggerRef.current?.focus({ preventScroll: true });
      },
      [closeMenu, onValueChange],
    );

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

    useLayoutEffect(() => {
      if (!open) return;
      const list = listRef.current;
      const option = list?.querySelector(`[data-option-index="${highlightedIndex}"]`);
      if (list && option instanceof HTMLElement) {
        scrollChildIntoContainer(list, option);
      }
    }, [open, highlightedIndex]);

    useEffect(() => {
      if (!open) return;

      const onPointerDown = (event: MouseEvent) => {
        const target = event.target as Node;
        if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) {
          return;
        }
        closeMenu();
      };

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeMenu();
          triggerRef.current?.focus({ preventScroll: true });
        }
      };

      document.addEventListener('mousedown', onPointerDown);
      document.addEventListener('keydown', onKeyDown);
      return () => {
        document.removeEventListener('mousedown', onPointerDown);
        document.removeEventListener('keydown', onKeyDown);
      };
    }, [closeMenu, open]);

    const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;

      if (!open) {
        if (
          event.key === 'ArrowDown'
          || event.key === 'ArrowUp'
          || event.key === 'Enter'
          || event.key === ' '
        ) {
          event.preventDefault();
          openMenu(event.key === 'ArrowUp' ? 'last' : 'selected');
        }
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, options.length - 1));
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        setHighlightedIndex(0);
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        setHighlightedIndex(options.length - 1);
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (highlighted) handleSelect(highlighted.value);
        return;
      }

      if (event.key === 'Tab') {
        closeMenu();
      }
    };

    const showMenu = open && menuPosition !== null;

    const menu = showMenu ? (
      <div
        ref={menuRef}
        {...{ [PORTAL_OVERLAY_ATTR]: '' }}
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
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="max-h-60 overflow-y-auto p-1"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlightedIndex;
            return (
              <li
                key={option.value}
                role="presentation"
              >
                <div
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  data-option-index={index}
                  aria-selected={isSelected}
                  className={clsx(
                    'relative flex w-full cursor-pointer select-none items-center gap-2 rounded-xs px-2 py-1.5 text-left text-sm outline-none',
                    isHighlighted && !isSelected && 'bg-foreground/18 ring-1 ring-inset ring-foreground/25',
                    isSelected && !isHighlighted && 'bg-primary/10 text-primary dark:bg-foreground/5 shadow-[inset_0_0_0_1px_var(--selection-ring)]',
                    isSelected && isHighlighted && 'bg-primary/25 text-primary ring-1 ring-inset ring-primary/50',
                  )}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
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
                </div>
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
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-activedescendant={highlightedOptionId}
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
            if (open) closeMenu();
            else openMenu();
          }}
          onKeyDown={handleTriggerKeyDown}
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
        {portalRoot && menu && createPortal(menu, portalRoot)}
      </>
    );
  },
);

Select.displayName = 'Select';

export default Select;
