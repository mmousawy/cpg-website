'use client';

import { useSearch } from '@/hooks/useSearch';
import clsx from 'clsx';
import { FocusTrap } from 'focus-trap-react';
import { useRouter } from 'next/navigation';
import CloseSVG from 'public/icons/close.svg';
import { useCallback, useEffect, useRef, useState } from 'react';
import SearchInput from './SearchInput';
import SearchResults from './SearchResults';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [isTrapped, setIsTrapped] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const { query, setQuery, results, isLoading, isEmpty } = useSearch({
    debounceMs: 300,
    minQueryLength: 2,
  });

  // Wrap setQuery to reset selection when query changes
  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery);
    setSelectedIndex(-1);
  }, [setQuery]);

  // Handle modal open/close
  useEffect(() => {
    if (modalRef.current) {
      if (isOpen) {
        modalRef.current.show();
        document.body.style.overflow = 'hidden';
        const timerId = setTimeout(() => setIsTrapped(true), 16);
        return () => clearTimeout(timerId);
      } else {
        modalRef.current.close();
        document.body.style.overflow = 'auto';
        const timerId = setTimeout(() => setIsTrapped(false), 0);
        return () => clearTimeout(timerId);
      }
    }
  }, [isOpen]);

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Delay reset to allow close animation
      const timer = setTimeout(() => {
        setQuery('');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, setQuery]);

  // Navigate to selected result
  const navigateToResult = useCallback((index: number) => {
    if (index >= 0 && index < results.length) {
      const result = results[index];
      if (result.url) {
        onClose();
        router.push(result.url);
      }
    }
  }, [results, onClose, router]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : prev,
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0) {
            navigateToResult(selectedIndex);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, results.length, selectedIndex, navigateToResult]);

  const handleResultSelect = () => {
    // Close modal when a result is selected
    onClose();
  };

  return (
    <dialog
      ref={modalRef}
      className={clsx([
        isOpen ? 'pointer-events-auto visible opacity-100' : 'pointer-events-none invisible opacity-0',
        'fixed inset-0 z-50 overflow-auto',
        'flex size-full max-h-none max-w-none p-4 max-sm:p-2',
        'bg-black/40 backdrop-blur-sm',
        'transition-[visibility,opacity] duration-300',
      ])}
      onClick={(e) => {
        // Close when clicking backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <FocusTrap
        active={isTrapped}
        focusTrapOptions={{
          clickOutsideDeactivates: false,
          escapeDeactivates: true,
          onDeactivate: onClose,
          fallbackFocus: () => modalRef.current || document.body,
        }}
      >
        <div
          className={clsx([
            isOpen ? 'scale-100' : 'scale-95',
            'w-full max-w-xl',
            'relative m-auto',
            'max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)]',
            'flex flex-col',
            'rounded-2xl border-[0.0625rem] border-border-color bg-background-light shadow-xl shadow-black/25',
            'transition-transform duration-300',
          ])}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="shrink-0 flex items-center gap-4 border-b border-border-color p-4"
          >
            <SearchInput
              value={query}
              onChange={handleQueryChange}
              autoFocus={isOpen}
            />
            <button
              className="shrink-0 rounded-full border border-border-color p-1.5 hover:bg-background transition-colors"
              onClick={onClose}
              aria-label="Close search"
            >
              <CloseSVG
                className="size-4 fill-foreground"
              />
            </button>
          </div>

          {/* Results */}
          <div
            className="flex-1 min-h-0 overflow-y-auto p-4"
          >
            {query.length < 2 ? (
              <div
                className="flex flex-col items-center justify-center min-h-22 text-center"
              >
                <p
                  className="text-foreground/60"
                >
                  Start typing to search...
                </p>
                <p
                  className="mt-2 text-sm text-foreground/40"
                >
                  Search across albums, photos, members, events, and tags
                </p>
              </div>
            ) : (
              <SearchResults
                results={results}
                isLoading={isLoading}
                isEmpty={isEmpty}
                query={query}
                onResultSelect={handleResultSelect}
                selectedIndex={selectedIndex}
              />
            )}
          </div>

          {/* Footer hint - hidden on mobile */}
          <div
            className="hidden sm:block shrink-0 border-t border-border-color px-4 py-2 text-xs text-foreground/40"
          >
            <div
              className="flex items-center justify-between"
            >
              <span>
                Press Esc to close
              </span>
              <span>
                ↑↓ to navigate, Enter to select
              </span>
            </div>
          </div>
        </div>
      </FocusTrap>
    </dialog>
  );
}
