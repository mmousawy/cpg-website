'use client';

import clsx from 'clsx';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useMounted } from '@/hooks/useMounted';
import Avatar from '../auth/Avatar';
import AccountMenuPanel from './AccountMenuPanel';

/** Must stay inside `<Suspense>` — `usePathname()` is a blocking client hook. */
export default function UserMenu() {
  const { user, profile, isLoading } = useAuth();
  const mounted = useMounted();
  const showSkeleton = !mounted || isLoading;
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  const closeMenu = () => {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (detailsRef.current && !detailsRef.current.contains(event.target as Node)) {
        detailsRef.current.open = false;
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  }, [pathname]);

  return (
    <details
      ref={detailsRef}
      className="relative group shrink-0"
    >
      <summary
        className="list-none cursor-pointer block rounded-full hover:outline-primary hover:outline-2 focus:outline-primary focus:outline-2 outline-transparent group-open:outline-primary group-open:outline-2 [&::-webkit-details-marker]:hidden"
        aria-label="User menu"
      >
        {showSkeleton ? (
          <div
            className="size-12 shrink-0 animate-pulse rounded-full bg-border-color"
            aria-hidden
          />
        ) : (
          <Avatar
            size="md"
            avatarUrl={profile?.avatar_url}
            fullName={profile?.full_name}
            usePersonIconFallback
          />
        )}
      </summary>

      <div
        className={clsx(
          'absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border-color-strong bg-background-light bg-no-noise shadow-lg',
        )}
      >
        <AccountMenuPanel onClose={closeMenu} />
      </div>
    </details>
  );
}
