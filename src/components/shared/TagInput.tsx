'use client';

import { filterTagsByPrefix, useGlobalTags } from '@/hooks/useGlobalTags';
import type { Tag } from '@/types/photos';
import CloseSVG from 'public/icons/close.svg';
import { useEffect, useRef, useState } from 'react';
import Input from './Input';

interface TagInputProps {
  id: string;
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  maxTags?: number;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
  /** Map of tag names to their counts (e.g., { "nature": 3, "landscape": 5 }) */
  tagCounts?: Record<string, number>;
  /** Total number of items being edited (for showing "3/5" format) */
  totalCount?: number;
  /** Tags to display but not allow removing (e.g., partially shared tags) */
  readOnlyTags?: string[];
}

export default function TagInput({
  id,
  tags,
  onAddTag,
  onRemoveTag,
  maxTags = 5,
  placeholder,
  helperText,
  disabled = false,
  tagCounts,
  totalCount,
  readOnlyTags = [],
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { data: globalTags = [] } = useGlobalTags();
  const isMaxReached = tags.length >= maxTags;

  // Filter suggestions based on input, excluding already-selected tags
  const suggestions = filterTagsByPrefix(
    globalTags.filter((t) => !tags.includes(t.name)),
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

  const handleAddTag = (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase();
    if (normalizedTag && !tags.includes(normalizedTag) && tags.length < maxTags) {
      onAddTag(normalizedTag);
      setInputValue('');
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        handleAddTag(suggestions[highlightedIndex].name);
      } else if (inputValue.trim()) {
        handleAddTag(inputValue);
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

  const handleSuggestionClick = (tag: Tag) => {
    handleAddTag(tag.name);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Selected tags - show all tags from tagCounts for visibility */}
      {tagCounts && Object.keys(tagCounts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.keys(tagCounts)
            .sort((a, b) => {
              const countDiff = (tagCounts[b] || 0) - (tagCounts[a] || 0);
              if (countDiff !== 0) return countDiff;
              return a.localeCompare(b);
            })
            .map((tag) => {
              const count = tagCounts[tag];
              const isFullyShared = totalCount && count === totalCount;
              const isInForm = tags.includes(tag);
              const isReadOnly = readOnlyTags.includes(tag) || (!isInForm && count < (totalCount || 0));

              return (
                <span
                  key={tag}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
                    isFullyShared ? 'bg-foreground/10' : 'bg-foreground/5'
                  }`}
                >
                  <span>{tag}</span>
                  {totalCount && count !== undefined && count < totalCount && (
                    <span className="text-xs text-foreground/60 font-normal">({count}/{totalCount})</span>
                  )}
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => onRemoveTag(tag)}
                      className="-mr-2 ml-1 flex size-5 items-center justify-center rounded-full bg-background-light/70 font-bold text-foreground hover:bg-background-light"
                      aria-label={`Remove ${tag} tag`}
                      disabled={disabled}
                    >
                      <CloseSVG className="size-3.5 fill-foreground" />
                    </button>
                  )}
                </span>
              );
            })}
        </div>
      )}
      {/* Fallback: show tags from form if no tagCounts provided */}
      {(!tagCounts || Object.keys(tagCounts).length === 0) && tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-3 py-1 text-sm font-medium"
            >
              {tag}
              <button
                type="button"
                onClick={() => onRemoveTag(tag)}
                className="-mr-2 ml-1 flex size-5 items-center justify-center rounded-full bg-background-light/70 font-bold text-foreground hover:bg-background-light"
                aria-label={`Remove ${tag} tag`}
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
              ? `Maximum of ${maxTags} tags reached`
              : placeholder || 'Type a tag and press Enter'
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
              {suggestions.map((tag, index) => (
                <li key={tag.id}>
                  <button
                    type="button"
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-foreground/5 ${
                      index === highlightedIndex ? 'bg-foreground/10' : ''
                    }`}
                    onClick={() => handleSuggestionClick(tag)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <span className="font-medium">{tag.name}</span>
                    <span className="ml-2 text-foreground/50">({tag.count})</span>
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
