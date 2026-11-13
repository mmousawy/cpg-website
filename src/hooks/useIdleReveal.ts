'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

const PROMINENT_MS = 2000;
const SCROLL_HIDE_PX = 24;

/**
 * Full → hidden overlay; pointer activity on `target` brings it back briefly.
 */
export function useIdleReveal(
  targetRef: RefObject<HTMLElement | null>,
  routeKey: string,
) {
  const [phase, setPhase] = useState<'prominent' | 'hidden'>('prominent');
  const [pillHover, setPillHover] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      setPhase('hidden');
    }, PROMINENT_MS);
  }, [clearTimer]);

  const revealProminent = useCallback(() => {
    setPhase('prominent');
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    revealProminent();
    return clearTimer;
  }, [routeKey, revealProminent, clearTimer]);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    let lastPulse = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastPulse < 120) return;
      lastPulse = now;
      setPhase('prominent');
      scheduleHide();
    };

    el.addEventListener('pointermove', onActivity);
    el.addEventListener('touchstart', onActivity, { passive: true });

    return () => {
      el.removeEventListener('pointermove', onActivity);
      el.removeEventListener('touchstart', onActivity);
    };
  }, [scheduleHide, targetRef]);

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > SCROLL_HIDE_PX) {
        setPhase('hidden');
        clearTimer();
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [clearTimer]);

  const opacity = pillHover || phase === 'prominent' ? 1 : 0;

  return {
    opacity,
    pointerEvents: phase === 'hidden' && !pillHover ? ('none' as const) : ('auto' as const),
    onPillEnter: () => setPillHover(true),
    onPillLeave: () => setPillHover(false),
  };
}
