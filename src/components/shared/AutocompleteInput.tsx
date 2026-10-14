'use client';

import clsx from 'clsx';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getOverlayPortalRoot, PORTAL_OVERLAY_ATTR } from '@/lib/focusTrapPortals';
import Input from './Input';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  /** Custom render for each suggestion row. Receives the suggestion string and whether it's highlighted. */
  renderSuggestion?: (suggestion: string, highlighted: boolean) => React.ReactNode;
  /** Called when a suggestion is selected (click or Enter on highlighted). Defaults to calling onChange. */
  onSelect?: (suggestion: string) => void;
  /** Called when Enter is pressed with no highlighted suggestion (free-form submit). */
  onSubmit?: (value: string) => void;
  /** Skip internal filtering — parent provides a pre-filtered list. */
  disableFilter?: boolean;
  /** Render suggestions in normal flow (grows parent). Default: floating overlay. */
  inlineSuggestions?: boolean;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  containerClassName?: string;
  className?: string;
  /** Show a loading row while the parent fetches suggestions */
  loading?: boolean;
  /** Error state — forwarded to the underlying input */
  error?: boolean;
}

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
};

export default function AutocompleteInput({
  value,
  onChange,
  suggestions,
  renderSuggestion,
  onSelect,
  onSubmit,
  disableFilter = false,
  inlineSuggestions = false,
  id,
  placeholder,
  disabled = false,
  fullWidth = true,
  containerClassName,
  className,
  loading = false,
  error = false,
}: AutocompleteInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = disableFilter
    ? suggestions
    : suggestions.filter(
      (s) => s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase(),
    );

  const updateDropdownPosition = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    const rect = input.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!showSuggestions || inlineSuggestions) {
      setPortalRoot(null);
      return;
    }
    setPortalRoot(getOverlayPortalRoot(inputRef.current) ?? document.body);
    updateDropdownPosition();
    const onLayoutChange = () => updateDropdownPosition();
    window.addEventListener('resize', onLayoutChange);
    window.addEventListener('scroll', onLayoutChange, true);
    return () => {
      window.removeEventListener('resize', onLayoutChange);
      window.removeEventListener('scroll', onLayoutChange, true);
    };
  }, [showSuggestions, inlineSuggestions, updateDropdownPosition, filtered.length, loading]);

  useEffect(() => {
    if (inlineSuggestions || !showSuggestions) {
      return;
    }
    const dialog = inputRef.current?.closest('dialog');
    if (!(dialog instanceof HTMLDialogElement) || !dialog.open) {
      return;
    }

    const dismiss = () => setShowSuggestions(false);
    dialog.addEventListener('close', dismiss);
    const observer = new MutationObserver(() => {
      if (!dialog.open) {
        dismiss();
      }
    });
    observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });

    return () => {
      dialog.removeEventListener('close', dismiss);
      observer.disconnect();
    };
  }, [showSuggestions, inlineSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (s: string) => {
    if (onSelect) {
      onSelect(s);
    } else {
      onChange(s);
    }
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && filtered[highlightedIndex]) {
        handleSelect(filtered[highlightedIndex]);
      } else if (onSubmit && value.trim()) {
        onSubmit(value);
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
      return;
    }

    if (!showSuggestions || filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const showDropdown =
    showSuggestions
    && (loading || filtered.length > 0)
    && (inlineSuggestions || dropdownPosition !== null);

  const dropdown = showDropdown ? (
    <div
      ref={dropdownRef}
      {...{ [PORTAL_OVERLAY_ATTR]: '' }}
      className={clsx(
        'rounded-md border border-border-color-strong bg-background-medium bg-no-noise shadow-lg shadow-black/15 ring-1 ring-black/5 dark:shadow-black/35 dark:ring-white/10',
        inlineSuggestions ? 'relative mt-1 w-full' : 'fixed z-[100]',
      )}
      style={
        inlineSuggestions || !dropdownPosition
          ? undefined
          : {
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
      }
      }
    >
      <ul
        className="max-h-48 overflow-y-auto p-1"
      >
        {loading && filtered.length === 0 && (
          <li
            className="px-3 py-2 text-sm text-foreground/60"
          >
            Searching…
          </li>
        )}
        {filtered.map((suggestion, index) => (
          <li
            key={`${suggestion}-${index}`}
          >
            <button
              type="button"
              className={`w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-background-light ${index === highlightedIndex ? 'bg-background-light' : ''
              }`}
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {renderSuggestion ? renderSuggestion(suggestion, index === highlightedIndex) : suggestion}
            </button>
          </li>
        ))}
      </ul>
    </div>
  ) : null;

  return (
    <div
      className={clsx('relative', containerClassName)}
    >
      <Input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowSuggestions(true);
          setHighlightedIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
        fullWidth={fullWidth}
        error={error}
        className={className}
      />

      {inlineSuggestions
        ? dropdown
        : dropdown && portalRoot && createPortal(dropdown, portalRoot)}
    </div>
  );
}
