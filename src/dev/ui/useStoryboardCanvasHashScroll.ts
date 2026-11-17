'use client';

import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

import { resolveWorkbenchScrollBehavior } from '@/dev/workbench/motion';

import { resetStoryboardShellScroll, scrollStoryboardTarget } from './scrollStoryboardTarget';

export function useStoryboardCanvasHashScroll(
  scrollRef: RefObject<HTMLDivElement | null>,
  hash: string,
  scopeKey: string,
) {
  const prevScopeKeyRef = useRef<string | null>(null);
  const mountedRef = useRef(false);

  useLayoutEffect(() => {
    resetStoryboardShellScroll();
  }, [hash, scopeKey]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const scopeChanged =
      prevScopeKeyRef.current !== null && prevScopeKeyRef.current !== scopeKey;
    prevScopeKeyRef.current = scopeKey;

    const scrollToId = (id: string, behavior: ScrollBehavior) => {
      const resolved = resolveWorkbenchScrollBehavior(behavior);
      const run = () => scrollStoryboardTarget(container, id, { behavior: resolved });
      requestAnimationFrame(() => {
        run();
        if (resolved === 'auto') {
          requestAnimationFrame(run);
        }
      });
    };

    const onJump = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string }>).detail;
      if (detail?.id) {
        scrollToId(detail.id, 'smooth');
      }
    };

    document.addEventListener('storyboard-scroll-to', onJump);
    if (hash) {
      const instant = !mountedRef.current || scopeChanged;
      mountedRef.current = true;
      scrollToId(hash, instant ? 'auto' : 'smooth');
    }

    return () => {
      document.removeEventListener('storyboard-scroll-to', onJump);
    };
  }, [hash, scopeKey, scrollRef]);
}
