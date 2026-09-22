/** Shared frosted pill styling for mobile bottom chrome (tab bar, action bars). */
export const mobileFloatingPillClassName =
  'bg-noise max-sm:rounded-2xl max-sm:border max-sm:border-border-color-strong max-sm:bg-background-light/85 max-sm:shadow-lg max-sm:backdrop-blur-xl';

/** Horizontal inset + gap above the tab bar for stacked floating pills. */
export const mobileFloatingPillInsetClassName = 'max-sm:px-3';

/** Bottom sticky chrome: same screen inset as the tab bar, plus 0.25rem. */
export const mobileStickyBottomWithGapClassName =
  'sticky bottom-0 max-sm:pb-1';

/**
 * In-flow spacer below a settled sticky bar. Must be a sibling (not a wrapper)
 * so sticky containing-block height is unchanged (`mb-3.5` minus the bar's `pb-1`).
 */
export const mobileStickyBarSettleGapClassName =
  'mobile-sticky-bar-settle-gap pointer-events-none max-sm:h-[calc(0.875rem-0.25rem)] sm:hidden';

/** Bottom sticky chrome flush with the tab bar's screen inset. */
export const mobileStickyBottomClassName =
  'sticky bottom-0';

/**
 * Mobile bottom chrome stacking (low → high):
 * scrim z-25 → sticky action bars z-30 → tab bar / backdrop / popovers z-35
 */
export const mobileStickyChromeZClassName = 'max-sm:z-30';

export const mobileTabBarZClassName = 'max-sm:z-[35]';

export const mobileScrimZClassName = 'max-sm:z-[25]';

/** Sliding active-tab pill — fill + inset highlight. */
export const mobileTabActivePillClassName =
  'bg-foreground/[0.14] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.55),inset_0_0_0_1px_rgba(0,0,0,0.07)] dark:bg-foreground/[0.12] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_0_0_1px_#ededed1c]';

/** Active tab label (background lives on the sliding pill). */
export const mobileTabActiveClassName =
  'text-foreground/90 font-medium';

/** Duration for sequenced sticky-bar hide/show slides. Matches `.mobile-sticky-bar-slide`. */
export const STICKY_BAR_SLIDE_MS = 250;

export function getStickyBarSlideDurationMs() {
  if (typeof window === 'undefined') return 0;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
  if (!window.matchMedia('(max-width: 639px)').matches) return 0;
  return STICKY_BAR_SLIDE_MS;
}
