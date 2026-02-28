'use client';

import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
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
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  containerClassName?: string;
  className?: string;
}

export default function AutocompleteInput({
  value,
  onChange,
  suggestions,
  renderSuggestion,
  onSelect,
  onSubmit,
  disableFilter = false,
  id,
  placeholder,
  disabled = false,
  fullWidth = true,
  containerClassName,
  className,
}: AutocompleteInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = disableFilter
    ? suggestions
    : suggestions.filter(
      (s) => s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase(),
    );

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
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
        fullWidth={fullWidth}
        className={className}
      />

      {showSuggestions && filtered.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-30 mt-1 w-full rounded-md border border-border-color bg-background shadow-lg"
        >
          <ul
            className="max-h-48 overflow-y-auto p-1"
          >
            {filtered.map((suggestion, index) => (
              <li
                key={suggestion}
              >
                <button
                  type="button"
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-foreground/5 ${
                    index === highlightedIndex ? 'bg-foreground/10' : ''
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
      )}
    </div>
  );
}
