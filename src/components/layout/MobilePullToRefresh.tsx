'use client';

import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  triggerNavigationProgress,
  triggerNavigationProgressComplete,
} from '@/components/layout/NavigationProgress';
import { getScrollContainer, isMobilePinnedShell } from '@/utils/scrollContainer';

const PULL_THRESHOLD_PX = 72;
const MAX_PULL_PX = 120;
const REFRESH_HOLD_MS = 800;

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 -960 960 960"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M480-192q-120 0-204-84t-84-204q0-120 84-204t204-84q65 0 120.5 27t95.5 72v-99h72v240H528v-72h131q-29-44-76-70t-103-26q-90 0-153 63t-63 153q0 90 63 153t153 63q84 0 144-55.5T693-456h74q-9 112-91 188t-196 76Z"/>
    </svg>
  );
}

/**
 * Restores pull-to-refresh when document scroll is disabled (mobile pinned shell).
 * Triggers a Next.js soft refresh of server components / cached RSC payload and
 * pipes it through the shared navigation progress bar so the screen darkens and
 * the top loader shows up the same way it does for real route transitions.
 *
 * Once a pull begins at the top of the scroll container, the gesture stays
 * captive until touchend so dragging back up eases the indicator back instead
 * of handing control to the scroller mid-pull.
 */
export default function MobilePullToRefresh() {
  const router = useRouter();
  const [pullPx, setPullPx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartYRef = useRef(0);
  // "candidate": finger is down at the top of the scroller but we haven't
  // detected a downward pull yet, so native scroll (upward swipe) is still
  // allowed. "pulling": the user has moved down past the activation slop and
  // we've taken the gesture captive.
  const candidateRef = useRef(false);
  const pullingRef = useRef(false);
  const pullPxRef = useRef(0);
  const refreshingRef = useRef(false);
  const [isPulling, setIsPulling] = useState(false);

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (!isMobilePinnedShell() || refreshingRef.current) return;
    const container = getScrollContainer();
    if (!container || e.target === null) return;
    if (!container.contains(e.target as Node)) return;
    if (container.scrollTop > 0) return;

    touchStartYRef.current = e.touches[0]?.clientY ?? 0;
    candidateRef.current = true;
    pullingRef.current = false;
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!candidateRef.current && !pullingRef.current) return;

    const y = e.touches[0]?.clientY ?? 0;
    const rawDelta = y - touchStartYRef.current;

    if (!pullingRef.current) {
      // Still in the candidate window: if the user swipes up (or barely
      // moves), let native scrolling take over and drop the gesture entirely.
      // Only activate the pull once they've moved down past a small slop.
      const ACTIVATION_SLOP_PX = 6;
      if (rawDelta <= ACTIVATION_SLOP_PX) {
        if (rawDelta < 0) {
          candidateRef.current = false;
        }
        return;
      }
      // Also bail out if the scroller has moved off the top (e.g. inertial
      // scroll continued into the touchstart).
      const container = getScrollContainer();
      if (!container || container.scrollTop > 0) {
        candidateRef.current = false;
        return;
      }
      candidateRef.current = false;
      pullingRef.current = true;
      setIsPulling(true);
    }

    // From here on the gesture is captive: clamp negative pulls to 0 so the
    // icon eases back toward the top instead of releasing to the scroller.
    const delta = Math.max(0, rawDelta);
    const next = Math.min(MAX_PULL_PX, delta * 0.45);

    pullPxRef.current = next;
    setPullPx(next);

    if (e.cancelable) {
      e.preventDefault();
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    const wasPulling = pullingRef.current;
    candidateRef.current = false;
    pullingRef.current = false;
    if (!wasPulling) return;
    setIsPulling(false);

    const releasedPull = pullPxRef.current;
    if (releasedPull >= PULL_THRESHOLD_PX && !refreshingRef.current) {
      refreshingRef.current = true;
      setRefreshing(true);
      pullPxRef.current = PULL_THRESHOLD_PX * 0.55;
      setPullPx(PULL_THRESHOLD_PX * 0.55);

      // Show the same darkening overlay + top progress bar used for real
      // route transitions, then complete it after the refresh settles.
      triggerNavigationProgress();
      router.refresh();

      window.setTimeout(() => {
        refreshingRef.current = false;
        setRefreshing(false);
        pullPxRef.current = 0;
        setPullPx(0);
        triggerNavigationProgressComplete();
      }, REFRESH_HOLD_MS);
      return;
    }

    pullPxRef.current = 0;
    setPullPx(0);
  }, [router]);

  useEffect(() => {
    const moveOpts: AddEventListenerOptions = { passive: false };
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, moveOpts);
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [onTouchEnd, onTouchMove, onTouchStart]);

  const progress = Math.min(1, pullPx / PULL_THRESHOLD_PX);
  const visible = isMobilePinnedShell() && (pullPx > 2 || refreshing);

  if (!visible) {
    return null;
  }

  const indicatorScale = refreshing ? 1 : 0.55 + progress * 0.45;
  const indicatorY = Math.max(0, pullPx * 0.85);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[45] flex justify-center sm:hidden"
      style={{
        transform: `translateY(${indicatorY}px)`,
        transition: isPulling ? 'none' : 'transform 220ms cubic-bezier(0.33, 1, 0.68, 1)',
      }}
      aria-hidden={!visible}
      aria-live="polite"
    >
      <div
        className={clsx(
          'mt-[max(0.5rem,env(safe-area-inset-top))] flex size-10 items-center justify-center rounded-full',
          'border border-border-color bg-background-light/95 shadow-md backdrop-blur-sm',
          refreshing && 'border-primary/30',
        )}
        style={{
          transform: `scale(${indicatorScale})`,
          transition: isPulling ? 'none' : 'transform 220ms cubic-bezier(0.33, 1, 0.68, 1)',
        }}
      >
        <span
          className={clsx(
            'flex items-center justify-center',
            refreshing ? 'animate-spin' : 'origin-center',
          )}
          style={
            refreshing
              ? undefined
              : {
                  transform: `rotate(${progress * 360}deg)`,
                  transition: isPulling ? 'none' : 'transform 220ms ease',
                }
          }
        >
          <RefreshIcon className="size-6 text-foreground/75" />
        </span>
      </div>
    </div>
  );
}
