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

/** Shared content width for the onboarding header, form, and progress chrome. */
export const onboardingChromeInnerClassName = 'mx-auto w-full max-w-xl';

type OnboardingStepLayoutOptions = {
  formRef: RefObject<HTMLElement | null>;
  contentRef: RefObject<HTMLElement | null>;
  progressRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  /** Intro step: min-height on `contentRef` + `justify-center` for vertical balance. */
  centerContentInViewport: boolean;
};

/**
 * Reserves space above the fixed progress footer (`margin-bottom` on the form).
 * On the intro step only, sets min-height on the content wrapper (not the whole form).
 */
export function useOnboardingStepLayout({
  formRef,
  contentRef,
  progressRef,
  enabled,
  centerContentInViewport,
}: OnboardingStepLayoutOptions) {
  useLayoutEffect(() => {
    if (!enabled) return;

    const formEl = formRef.current;
    const contentEl = contentRef.current;
    const progress = progressRef.current;
    if (!formEl || !contentEl || !progress) return;

    const update = () => {
      const progressHeight = progress.offsetHeight;
      const formPaddingBottom =
        parseFloat(getComputedStyle(formEl).paddingBottom) || 0;
      // `py-8` on the form supplies content breathing room; margin only clears the fixed bar.
      formEl.style.marginBottom = `${progressHeight}px`;

      if (!centerContentInViewport) {
        contentEl.style.minHeight = '';
        return;
      }

      const offsetTop = contentEl.getBoundingClientRect().top + window.scrollY;
      const outerBottomPadding = ancestorPaddingBottom(formEl);
      const available =
        window.innerHeight -
        offsetTop -
        progressHeight -
        formPaddingBottom -
        outerBottomPadding;
      contentEl.style.minHeight = `${Math.max(0, available)}px`;
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(progress);
    window.addEventListener('resize', update);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      formEl.style.marginBottom = '';
      contentEl.style.minHeight = '';
    };
  }, [centerContentInViewport, contentRef, enabled, formRef, progressRef]);
}
