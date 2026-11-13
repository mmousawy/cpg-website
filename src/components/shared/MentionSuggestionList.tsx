'use client';

import Avatar from '@/components/auth/Avatar';
import { pageFloatingZClassName } from '@/components/layout/mobileChrome';
import type { MentionProfile } from '@/lib/mentions/types';
import clsx from 'clsx';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

type MentionSuggestionListProps = {
  results: MentionProfile[];
  loading: boolean;
  highlightedIndex: number;
  position: { top: number; left: number; width: number } | null;
  onHighlight: (index: number) => void;
  onSelect: (profile: MentionProfile) => void;
};

export default function MentionSuggestionList({
  results,
  loading,
  highlightedIndex,
  position,
  onHighlight,
  onSelect,
}: MentionSuggestionListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const option = listRef.current?.querySelector<HTMLElement>('[data-highlighted="true"]');
    option?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  if (!position || (!loading && results.length === 0)) return null;

  return createPortal(
    <div
      ref={listRef}
      role="listbox"
      className={clsx(
        'fixed max-h-64 overflow-y-auto rounded-md border border-border-color bg-background py-1 shadow-lg',
        pageFloatingZClassName,
      )}
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
      }}
    >
      {loading && results.length === 0 ? (
        <p
          className="px-3 py-2 text-sm text-foreground/60"
        >Searching members…</p>
      ) : results.map((profile, index) => (
        <button
          key={profile.id}
          type="button"
          role="option"
          aria-selected={index === highlightedIndex}
          data-highlighted={index === highlightedIndex}
          className={clsx(
            'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm',
            index === highlightedIndex ? 'bg-background-medium' : 'hover:bg-background-medium',
          )}
          onMouseEnter={() => onHighlight(index)}
          onMouseDown={(event) => {
            event.preventDefault();
            onSelect(profile);
          }}
        >
          <Avatar
            avatarUrl={profile.avatar_url}
            fullName={profile.full_name}
            nickname={profile.nickname}
            size="xs"
          />
          <span
            className="min-w-0"
          >
            <span
              className="block truncate font-medium"
            >
              {profile.full_name || profile.nickname}
            </span>
            <span
              className="block truncate text-xs text-foreground/70"
            >
              @{profile.nickname}
            </span>
          </span>
        </button>
      ))}
    </div>,
    document.body,
  );
}
