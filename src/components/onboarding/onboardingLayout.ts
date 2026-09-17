import { useLayoutEffect, type RefObject } from 'react';

function ancestorPaddingBottom(from: HTMLElement, stopAtId = 'main-content'): number {
  let padding = 0;
  let node: HTMLElement | null = from.parentElement;
  while (node && node.id !== stopAtId) {
    padding += parseFloat(getComputedStyle(node).paddingBottom) || 0;
    node = node.parentElement;
  }
  return padding;
}

/**
 * Sets min-height on the step element to the remaining viewport after:
 * - its offset from the top of the document (outer PageContainer top padding included)
 * - ancestor padding below it (PageContainer bottom padding)
 * - the measured progress footer height
 *
 * Does not pad the step for centering. Adds margin-bottom equal to the progress
 * footer so tall steps can scroll clear of it.
 */
export function useOnboardingStepMinHeight(
  stepRef: RefObject<HTMLElement | null>,
  progressRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useLayoutEffect(() => {
    if (!enabled) return;

    const step = stepRef.current;
    const progress = progressRef.current;
    if (!step || !progress) return;

    const update = () => {
      const offsetTop = step.getBoundingClientRect().top + window.scrollY;
      const progressHeight = progress.offsetHeight;
      const outerBottomPadding = ancestorPaddingBottom(step);
      const available =
        window.innerHeight - offsetTop - progressHeight - outerBottomPadding;
      step.style.minHeight = `${Math.max(0, available)}px`;
      step.style.marginBottom = `${progressHeight}px`;
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(progress);
    window.addEventListener('resize', update);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      step.style.minHeight = '';
      step.style.marginBottom = '';
    };
  }, [enabled, progressRef, stepRef]);
}
