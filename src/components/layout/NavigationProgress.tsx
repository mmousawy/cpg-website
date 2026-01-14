'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * Global navigation progress indicator.
 * Shows a thin loading bar at the top during route transitions.
 * Uses requestAnimationFrame for smooth progress animation.
 */
export default function NavigationProgress() {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const prevPathnameRef = useRef(pathname);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Listen for click events on links to detect navigation start
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');

      if (link && link.href) {
        try {
          const url = new URL(link.href);
          const currentUrl = new URL(window.location.href);

          // Only handle internal navigation to different pages
          if (
            url.origin === currentUrl.origin &&
            url.pathname !== currentUrl.pathname &&
            !link.hasAttribute('target') &&
            !link.hasAttribute('download') &&
            !e.ctrlKey &&
            !e.metaKey &&
            !e.shiftKey
          ) {
            setIsLoading(true);
            setProgress(0);

            // Clear any existing timeouts/animations
            if (loadingTimeoutRef.current) {
              clearTimeout(loadingTimeoutRef.current);
            }
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
            }

            // Animate progress using requestAnimationFrame
            const startTime = Date.now();
            const minDuration = 400; // Minimum animation duration

            const updateProgress = () => {
              const elapsed = Date.now() - startTime;

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
                animationFrameRef.current = requestAnimationFrame(updateProgress);
              }
            };

            animationFrameRef.current = requestAnimationFrame(updateProgress);
          }
        } catch {
          // Invalid URL, ignore
        }
      }
    };

    // Use capture phase to catch clicks early
    document.addEventListener('click', handleLinkClick, true);

    return () => {
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, []);

  // When pathname changes, complete the progress and hide
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;

      // Clear any existing timeouts/animations
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Complete the progress animation
      const ensureCompleteAndHide = () => {
        // Jump to 100%
        setProgress(100);

        // Wait for the animation to complete, then hide
        loadingTimeoutRef.current = setTimeout(() => {
          setIsLoading(false);
          setProgress(0);
        }, 200);
      };

      // Check if page is ready
      if (document.readyState === 'complete') {
        ensureCompleteAndHide();
      } else {
        // Wait for page to be ready
        const handleReady = () => ensureCompleteAndHide();
        window.addEventListener('load', handleReady, { once: true });

        // Fallback timeout (3 seconds max)
        loadingTimeoutRef.current = setTimeout(() => {
          window.removeEventListener('load', handleReady);
          ensureCompleteAndHide();
        }, 3000);
      }
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [pathname]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[9999] h-1.5 bg-primary/30">
      <div
        className="h-full origin-left bg-primary transition-transform duration-150 ease-out"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
    </div>
  );
}
