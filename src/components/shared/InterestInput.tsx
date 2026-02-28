'use client';

import { filterInterestsByPrefix, useGlobalInterests } from '@/hooks/useGlobalInterests';
import CloseSVG from 'public/icons/close.svg';
import { useState } from 'react';
import AutocompleteInput from './AutocompleteInput';

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
  const { data: globalInterests = [] } = useGlobalInterests();
  const isMaxReached = interests.length >= maxInterests;

  const filtered = filterInterestsByPrefix(
    globalInterests.filter((i) => !interests.includes(i.name)),
    inputValue,
  );

  const suggestionNames = filtered.map((i) => i.name);
  const countByName = new Map(filtered.map((i) => [i.name, i.count || 0]));

  const handleAdd = (value: string) => {
    const normalized = value.trim().toLowerCase();
    if (normalized && !interests.includes(normalized) && interests.length < maxInterests) {
      onAddInterest(normalized);
      setInputValue('');
    }
  };

  return (
    <div
      className="flex flex-col gap-2"
    >
      {interests.length > 0 && (
        <div
          className="flex flex-wrap gap-2"
        >
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
                <CloseSVG
                  className="size-3.5 fill-foreground"
                />
              </button>
            </span>
          ))}
        </div>
      )}

      <AutocompleteInput
        id={id}
        value={inputValue}
        onChange={setInputValue}
        suggestions={suggestionNames}
        disableFilter
        onSelect={handleAdd}
        onSubmit={handleAdd}
        renderSuggestion={(name) => (
          <>
            <span
              className="font-medium"
            >
              {name}
            </span>
            <span
              className="ml-2 text-foreground/50"
            >
              (
              {countByName.get(name) ?? 0}
              )
            </span>
          </>
        )}
        disabled={disabled || isMaxReached}
        placeholder={
          isMaxReached
            ? `Maximum of ${maxInterests} interests reached`
            : placeholder || 'Type an interest and press Enter'
        }
      />

      {helperText && (
        <p
          className="text-xs text-foreground/50"
        >
          {helperText}
        </p>
      )}
    </div>
  );
}
