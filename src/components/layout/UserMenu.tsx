'use client';

import clsx from 'clsx';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import AnimatedPopoverPanel from '@/components/shared/AnimatedPopoverPanel';
import { useAuth } from '@/hooks/useAuth';
import { useMounted } from '@/hooks/useMounted';
import Avatar from '../auth/Avatar';
import AccountMenuPanel from './AccountMenuPanel';

/** Must stay inside `<Suspense>` — `usePathname()` is a blocking client hook. */
export default function UserMenu() {
  const { user, profile, isLoading } = useAuth();
  const mounted = useMounted();
  const showSkeleton = !mounted || isLoading;
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => {
    setMenuOpen(false);
  };

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        className={clsx(
          'block cursor-pointer rounded-full outline-transparent hover:outline-primary hover:outline-2 focus:outline-primary focus:outline-2',
          menuOpen && 'outline-primary outline-2',
        )}
        aria-label="User menu"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        onClick={() => setMenuOpen((open) => !open)}
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
      </button>

      <AnimatedPopoverPanel
        open={menuOpen}
        origin="top-right"
        className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border-color-strong bg-background-light bg-no-noise shadow-lg"
      >
        <AccountMenuPanel onClose={closeMenu} showSiteLinks />
      </AnimatedPopoverPanel>
    </div>
  );
}
