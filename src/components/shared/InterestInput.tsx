'use client';

import { filterInterestsByPrefix, useGlobalInterests } from '@/hooks/useGlobalInterests';
import type { Interest } from '@/types/interests';
import CloseSVG from 'public/icons/close.svg';
import { useEffect, useRef, useState } from 'react';
import Input from './Input';

interface InterestInputProps {
  id: string;
  interests: string[];
  onAddInterest: (interest: string) => void;
  onRemoveInterest: (interest: string) => void;
  maxInterests?: number;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
}

export default function InterestInput({
  id,
  interests,
  onAddInterest,
  onRemoveInterest,
  maxInterests = 10,
  placeholder,
  helperText,
  disabled = false,
}: InterestInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { data: globalInterests = [] } = useGlobalInterests();
  const isMaxReached = interests.length >= maxInterests;

  // Filter suggestions based on input, excluding already-selected interests
  const suggestions = filterInterestsByPrefix(
    globalInterests.filter((i) => !interests.includes(i.name)),
    inputValue,
  );

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setShowSuggestions(true);
    setHighlightedIndex(-1);
  };

  const handleAddInterest = (interest: string) => {
    const normalizedInterest = interest.trim().toLowerCase();
    if (normalizedInterest && !interests.includes(normalizedInterest) && interests.length < maxInterests) {
      onAddInterest(normalizedInterest);
      setInputValue('');
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        handleAddInterest(suggestions[highlightedIndex].name);
      } else if (inputValue.trim()) {
        handleAddInterest(inputValue);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const handleSuggestionClick = (interest: Interest) => {
    handleAddInterest(interest.name);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Selected interests */}
      {interests.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {interests.map((interest) => (
            <span
              key={interest}
              className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-3 py-1 text-sm font-medium"
            >
              {interest}
              <button
                type="button"
                onClick={() => onRemoveInterest(interest)}
                className="-mr-2 ml-1 flex size-5 items-center justify-center rounded-full bg-background-light/70 font-bold text-foreground hover:bg-background-light"
                aria-label={`Remove ${interest} interest`}
                disabled={disabled}
              >
                <CloseSVG className="size-3.5 fill-foreground" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input with autocomplete */}
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          disabled={disabled || isMaxReached}
          placeholder={
            isMaxReached
              ? `Maximum of ${maxInterests} interests reached`
              : placeholder || 'Type an interest and press Enter'
          }
          autoComplete="off"
        />

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && inputValue.trim() && !isMaxReached && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 mt-1 w-full rounded-md border border-border-color bg-background shadow-lg"
          >
            <ul className="max-h-48 overflow-y-auto py-1">
              {suggestions.map((interest, index) => (
                <li key={interest.id}>
                  <button
                    type="button"
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-foreground/5 ${
                      index === highlightedIndex ? 'bg-foreground/10' : ''
                    }`}
                    onClick={() => handleSuggestionClick(interest)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <span className="font-medium">{interest.name}</span>
                    <span className="ml-2 text-foreground/50">({interest.count || 0})</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Helper text */}
      {helperText && <p className="text-xs text-foreground/50">{helperText}</p>}
    </div>
  );
}
