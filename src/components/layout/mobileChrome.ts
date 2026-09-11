/** Shared frosted pill styling for mobile bottom chrome (tab bar, action bars). */
export const mobileFloatingPillClassName =
  'max-sm:rounded-2xl max-sm:border max-sm:border-border-color-strong max-sm:bg-background-light/85 max-sm:bg-no-noise max-sm:shadow-lg max-sm:backdrop-blur-xl';

/** Horizontal inset + gap above the tab bar for stacked floating pills. */
export const mobileFloatingPillInsetClassName = 'max-sm:px-3 max-sm:pb-3.5';

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
