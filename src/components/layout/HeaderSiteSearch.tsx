'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useState } from 'react';

import { useKeepMounted } from '@/hooks/useKeepMounted';
import { subscribeRouteChange } from '@/lib/routeChange';
import { isOnboardingPath } from '@/utils/onboardingPath';

const SearchModal = dynamic(
  () => import('../search/SearchModal'),
  { ssr: false },
);

export default function HeaderSiteSearch() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchIntent, setSearchIntent] = useState(false);
  const searchReady = useKeepMounted(searchOpen || searchIntent);
  const disabled = isOnboardingPath(pathname);

  useLayoutEffect(() => {
    return subscribeRouteChange(() => {
      setSearchOpen(false);
    });
  }, []);

  useEffect(() => {
    if (disabled) {
      setSearchOpen(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    const handleSearchOpen = () => {
      setSearchOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('search:open', handleSearchOpen);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('search:open', handleSearchOpen);
    };
  }, [disabled]);

  if (disabled) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setSearchOpen(true)}
        onMouseEnter={() => setSearchIntent(true)}
        onFocus={() => setSearchIntent(true)}
        className="flex items-center justify-center gap-2 rounded-full p-2 text-foreground/80 transition-colors hover:text-foreground lg:rounded-lg lg:border lg:border-border-color lg:bg-background-medium lg:px-2 lg:py-1.5 lg:text-sm lg:hover:border-primary"
        aria-label="Search"
      >
        <svg
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          className="size-5 lg:size-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <span className="hidden lg:inline text-foreground/60">Search</span>
        <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border border-border-color bg-background px-1.5 font-mono text-xs font-medium text-foreground/50 [word-spacing:-0.25em]">
          <span className="hidden in-data-[platform=mac]:inline">⌘</span>
          <span className="inline in-data-[platform=mac]:hidden">Ctrl</span>
          {' + '}
          K
        </kbd>
      </button>

      {searchReady && (
        <SearchModal
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </>
  );
}
