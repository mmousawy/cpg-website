'use client';

import { useHasHover } from '@/hooks/useHasHover';
import { useMounted } from '@/hooks/useMounted';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

const DEFAULT_PROMINENT_MS = 2000;
const SCROLL_HIDE_PX = 24;

export type IdleRevealOptions = {
  /** Phase after `routeKey` changes on touch-first devices. */
  touchRoutePhase?: 'hidden' | 'prominent';
  prominentMs?: number;
};

/**
 * Full → hidden overlay; pointer activity on `target` brings it back briefly.
 * A press outside `target` hides immediately (except member hover cards / stage chrome).
 */
export function useIdleReveal(
  targetRef: RefObject<HTMLElement | null>,
  routeKey: string,
  options: IdleRevealOptions = {},
) {
  const hasHover = useHasHover();
  const mounted = useMounted();
  const prominentMs = options.prominentMs ?? DEFAULT_PROMINENT_MS;
  const touchRoutePhase = options.touchRoutePhase ?? 'hidden';
  const [phase, setPhase] = useState<'prominent' | 'hidden'>('prominent');
  const [pillHover, setPillHover] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [prevRouteKey, setPrevRouteKey] = useState(routeKey);
  const [prevHasHover, setPrevHasHover] = useState(hasHover);
  const [prevTouchRoutePhase, setPrevTouchRoutePhase] = useState(touchRoutePhase);
  const [prevProminentMs, setPrevProminentMs] = useState(prominentMs);
  const [didApplyClientPhase, setDidApplyClientPhase] = useState(false);

  if (
    mounted && (
      !didApplyClientPhase
      || routeKey !== prevRouteKey
      || hasHover !== prevHasHover
      || touchRoutePhase !== prevTouchRoutePhase
      || prominentMs !== prevProminentMs
    )
  ) {
    setDidApplyClientPhase(true);
    setPrevRouteKey(routeKey);
    setPrevHasHover(hasHover);
    setPrevTouchRoutePhase(touchRoutePhase);
    setPrevProminentMs(prominentMs);
    if (hasHover) {
      setPhase('prominent');
    } else {
      setPillHover(false);
      setPhase(touchRoutePhase === 'prominent' ? 'prominent' : 'hidden');
    }
  }

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hideNow = useCallback(() => {
    clearTimer();
    setPillHover(false);
    setPhase('hidden');
  }, [clearTimer]);

  const scheduleHide = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      setPhase('hidden');
    }, prominentMs);
  }, [clearTimer, prominentMs]);

  useEffect(() => {
    if (!mounted) return;
    if (hasHover || touchRoutePhase === 'prominent') {
      scheduleHide();
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [mounted, routeKey, hasHover, touchRoutePhase, scheduleHide, clearTimer]);

  useEffect(() => {
    let lastPulse = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastPulse < 120) return;
      lastPulse = now;
      setPhase('prominent');
      scheduleHide();
    };

    const attach = (el: HTMLElement) => {
      const onPointerDownInside = (event: PointerEvent) => {
        if (event.button !== 0) return;
        onActivity();
      };
      el.addEventListener('pointermove', onActivity);
      el.addEventListener('touchstart', onActivity, { passive: true });
      el.addEventListener('pointerdown', onPointerDownInside);
      return () => {
        el.removeEventListener('pointermove', onActivity);
        el.removeEventListener('touchstart', onActivity);
        el.removeEventListener('pointerdown', onPointerDownInside);
      };
    };

    const el = targetRef.current;
    if (el) {
      return attach(el);
    }

    let detach: (() => void) | undefined;
    const frame = requestAnimationFrame(() => {
      const lateEl = targetRef.current;
      if (lateEl) {
        detach = attach(lateEl);
      }
    });

    return () => {
      cancelAnimationFrame(frame);
      detach?.();
    };
  }, [scheduleHide, targetRef, routeKey]);

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > SCROLL_HIDE_PX) {
        hideNow();
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [hideNow]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const el = targetRef.current;
      if (!el) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (el.contains(target)) return;
      if (target instanceof Element && target.closest('[data-member-hover-card]')) return;
      if (target instanceof Element && target.closest('[data-photo-stage-chrome]')) return;
      hideNow();
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [hideNow, routeKey, targetRef]);

  const opacity = pillHover || phase === 'prominent' ? 1 : 0;

  return {
    opacity,
    pointerEvents: phase === 'hidden' && !pillHover ? ('none' as const) : ('auto' as const),
    hide: hideNow,
    onPillEnter: () => setPillHover(true),
    onPillLeave: () => setPillHover(false),
  };
}
