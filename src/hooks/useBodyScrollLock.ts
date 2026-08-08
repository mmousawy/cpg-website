'use client';

import { useEffect } from 'react';

import { lockBodyScroll, unlockBodyScroll } from '@/lib/bodyScrollLock';

/**
 * Locks body scroll while `locked` is true. Unlock runs in effect cleanup so
 * unmounting the overlay while open still restores scroll.
 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [locked]);
}
