'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

// Custom event name for triggering navigation progress
const NAVIGATION_START_EVENT = 'navigation:start';

/**
 * Trigger the navigation progress bar manually.
 * Usually not needed - use useProgressRouter() instead.
 */
export function triggerNavigationProgress() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NAVIGATION_START_EVENT));
  }
}

/**
 * A drop-in replacement for useRouter() that automatically triggers
 * the navigation progress bar on push() and replace().
 *
 * @example
 * // Instead of:
 * import { useRouter } from 'next/navigation';
 * const router = useRouter();
 *
 * // Use:
 * import { useProgressRouter } from '@/components/layout/NavigationProgress';
 * const router = useProgressRouter();
 *
 * // Then use normally:
 * router.push('/some-page');
 */
export function useProgressRouter(): AppRouterInstance {
  const router = useRouter();
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

  return useMemo(() => ({
    ...router,
    push: (href: string, options?: Parameters<AppRouterInstance['push']>[1]) => {
      // Only trigger progress if navigating to a different page
      try {
        const url = new URL(href, window.location.origin);
        if (url.pathname !== pathname) {
          triggerNavigationProgress();
        }
      } catch {
        // If URL parsing fails, trigger anyway to be safe
        triggerNavigationProgress();
      }
      return router.push(href, options);
    },
    replace: (href: string, options?: Parameters<AppRouterInstance['replace']>[1]) => {
      // Only trigger progress if navigating to a different page
      try {
        const url = new URL(href, window.location.origin);
        if (url.pathname !== pathname) {
          triggerNavigationProgress();
        }
      } catch {
        triggerNavigationProgress();
      }
      return router.replace(href, options);
    },
  }), [router, pathname]);
}

/**
 * Global navigation progress indicator.
 * Shows a thin loading bar at the top during route transitions.
 *
 * Detects navigation via:
 * 1. Click events on <a> tags (automatic)
 * 2. Custom 'navigation:start' events (from useProgressRouter)
 *
 * Completes when pathname changes.
 */
export default function NavigationProgress() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  const prevPathnameRef = useRef(pathname);
  const navigationStartTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  // Start the progress animation
  const startProgress = useCallback(() => {
    cleanup();
    navigationStartTimeRef.current = Date.now();
    setIsNavigating(true);
    setProgress(0);

    const animate = () => {
      if (!navigationStartTimeRef.current) return;

      const elapsed = Date.now() - navigationStartTimeRef.current;
      const minDuration = 400;

      let currentProgress: number;
      if (elapsed < minDuration) {
        // Fast progress up to 90% during minimum duration
        currentProgress = Math.min(90, (elapsed / minDuration) * 90);
      } else {
        // Slow progress from 90% to 95% (waiting for page)
        const extraTime = elapsed - minDuration;
        currentProgress = Math.min(95, 90 + (extraTime / 2000) * 5);
      }

      setProgress(currentProgress);

      if (currentProgress < 95) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [cleanup]);

  // Complete the progress animation
  const completeProgress = useCallback(() => {
    cleanup();
    navigationStartTimeRef.current = null;
    setProgress(100);

    hideTimeoutRef.current = setTimeout(() => {
      setIsNavigating(false);
      setProgress(0);
    }, 200);
  }, [cleanup]);

  // Listen for click events on links to detect navigation start
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      // Don't intercept if event was already handled
      if (e.defaultPrevented) return;

      const target = e.target as HTMLElement;
      const link = target.closest('a');

      if (link?.href) {
        try {
          const url = new URL(link.href);

          // Only handle internal navigation to different pages
          if (
            url.origin === window.location.origin &&
            url.pathname !== window.location.pathname &&
            !link.hasAttribute('target') &&
            !link.hasAttribute('download') &&
            !e.ctrlKey &&
            !e.metaKey &&
            !e.shiftKey
          ) {
            startProgress();
          }
        } catch {
          // Invalid URL, ignore
        }
      }
    };

    // Use capture phase to detect clicks early, but check defaultPrevented
    document.addEventListener('click', handleLinkClick, true);

    return () => {
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, [startProgress]);

  // Listen for custom navigation start events (from useProgressRouter)
  useEffect(() => {
    const handleNavigationStart = () => {
      startProgress();
    };

    window.addEventListener(NAVIGATION_START_EVENT, handleNavigationStart);

    return () => {
      window.removeEventListener(NAVIGATION_START_EVENT, handleNavigationStart);
    };
  }, [startProgress]);

  // When pathname changes, complete the progress
  // Note: This is intentional - we need to respond to pathname changes from Next.js
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      // Use microtask to avoid synchronous setState warning
      queueMicrotask(() => {
        completeProgress();
      });
    }
  }, [pathname, completeProgress]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  if (!isNavigating) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-9999 h-1 bg-primary/30"
    >
      <div
        className="h-full origin-left bg-primary transition-transform duration-150 ease-out"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
    </div>
  );
}
