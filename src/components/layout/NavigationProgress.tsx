'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, useTransition } from 'react';

function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // When route changes complete, hide the progress bar
    setIsNavigating(false);
    setProgress(100);

    // Reset after animation
    const timer = setTimeout(() => {
      setProgress(0);
    }, 200);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  // Intercept clicks on links to show loading state
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');

      if (
        anchor &&
        anchor.href &&
        anchor.href.startsWith(window.location.origin) &&
        !anchor.target &&
        !anchor.download &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey
      ) {
        const targetPath = new URL(anchor.href).pathname;
        if (targetPath !== pathname) {
          setIsNavigating(true);
          setProgress(30);

          // Simulate progress
          const interval = setInterval(() => {
            setProgress((prev) => {
              if (prev >= 90) {
                clearInterval(interval);
                return prev;
              }
              return prev + Math.random() * 10;
            });
          }, 200);

          // Cleanup on unmount or route change
          return () => clearInterval(interval);
        }
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [pathname]);

  if (!isNavigating && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 bg-transparent">
      <div
        className="h-full bg-primary transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}

export default function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}
