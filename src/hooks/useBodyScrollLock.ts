'use client';

import { useLayoutEffect } from 'react';

import { lockBodyScroll, unlockBodyScroll } from '@/lib/bodyScrollLock';

/**
 * Freezes document scroll while `locked` is true without hiding the scrollbar
 * or changing body overflow. Uses a layout effect so the lock captures scroll
 * position before `dialog.show()` / focus can move it.
 */
export function useBodyScrollLock(locked: boolean) {
  useLayoutEffect(() => {
    if (!locked) return;

    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [locked]);
}
