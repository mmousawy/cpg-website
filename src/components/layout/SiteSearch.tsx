'use client';

import dynamic from 'next/dynamic';
import { useEffect, useLayoutEffect, useState } from 'react';

import { useKeepMounted } from '@/hooks/useKeepMounted';
import { subscribeRouteChange } from '@/lib/routeChange';

const SearchModal = dynamic(
  () => import('../search/SearchModal'),
  { ssr: false },
);

/**
 * Global search overlay. Must live outside the desktop header — that header
 * is `display: none` on mobile, which would hide a nested `<dialog>`.
 */
export default function SiteSearch() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchIntent, setSearchIntent] = useState(false);
  const searchReady = useKeepMounted(searchOpen || searchIntent);

  useLayoutEffect(() => {
    return subscribeRouteChange(() => {
      setSearchOpen(false);
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    const handleSearchOpen = () => {
      setSearchOpen(true);
    };

    const handleSearchIntent = () => {
      setSearchIntent(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('search:open', handleSearchOpen);
    window.addEventListener('search:intent', handleSearchIntent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('search:open', handleSearchOpen);
      window.removeEventListener('search:intent', handleSearchIntent);
    };
  }, []);

  if (!searchReady) {
    return null;
  }

  return (
    <SearchModal
      isOpen={searchOpen}
      onClose={() => setSearchOpen(false)}
    />
  );
}
