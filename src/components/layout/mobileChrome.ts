import { prefersReducedMotion } from '@/utils/reduceMotion';

/** Shared pill styling for mobile bottom chrome (tab bar, action bars). */
export const mobileFloatingPillClassName =
  'bg-noise max-sm:rounded-2xl max-sm:border max-sm:border-border-color-strong max-sm:bg-background-light max-sm:shadow-lg';

/** Horizontal inset + gap above the tab bar for stacked floating pills. */
export const mobileFloatingPillInsetClassName = 'max-sm:px-3';

/** Page cards: cancel PageContainer px-3 gutter and square off sides on mobile. */
export const mobileBleedCardClassName =
  'max-sm:-mx-3 max-sm:rounded-none max-sm:border-x-0';

/** Bottom sticky chrome: pin 0.25rem above the tab bar (or next chrome bar). */
export const mobileStickyBottomWithGapClassName =
  'sticky max-sm:bottom-[calc(var(--mobile-nav-offset,4.5rem)+0.25rem)] sm:bottom-0';

/** Fixed bottom chrome for overflow-hidden shells (e.g. manage pages) — same pin line as sticky. */
export const mobileFixedBottomChromeClassName =
  'max-sm:fixed max-sm:inset-x-0 max-sm:bottom-[calc(var(--mobile-nav-offset,4.5rem)+0.25rem)]';

/**
 * In-flow spacer below a settled sticky bar. Must be a sibling (not a wrapper)
 * so the sticky containing block is unchanged.
 */
export const mobileStickyBarSettleGapClassName =
  'mobile-sticky-bar-settle-gap pointer-events-none max-sm:h-[calc(0.875rem-0.25rem)] sm:hidden';

/**
 * End-of-page settle gap. Matches the 0.25rem pin above the tab bar so the
 * bar does not jump up when it leaves sticky positioning.
 */
export const mobileStickyBarTerminalSettleGapClassName =
  'mobile-sticky-bar-settle-gap mobile-sticky-bar-settle-gap--terminal pointer-events-none max-sm:h-1 sm:hidden';

/** Bottom sticky chrome flush with the tab bar's screen inset. */
export const mobileStickyBottomClassName =
  'sticky bottom-0';

/**
 * Mobile bottom chrome stacking (low → high):
 * scrim z-25 → sticky action bars z-30 → tab bar / backdrop / popovers z-35
 */
export const mobileStickyChromeZClassName = 'max-sm:z-30';

/**
 * Full-screen overlays (modals, search, sheets).
 * Above sticky section headings (z-20), page titles (z-30), the tab bar (z-35),
 * and the site header (z-40). A dialog opened on top of a modal uses z-70.
 * In-page dialogs must portal to `document.body`. A local stacking context
 * (the profile hero is z-10) would otherwise paint them under sticky headings.
 */
export const modalOverlayZClassName = 'z-[60]';

export const nestedModalOverlayZClassName = 'z-[70]';

export const mobileTabBarZClassName = 'max-sm:z-[35]';

export const mobileScrimZClassName = 'max-sm:z-[25]';

/** Manage photos/albums: bottom chrome stays active below the `md` sidebar breakpoint. */
export const manageMobileFloatingPillClassName =
  'bg-noise max-md:rounded-2xl max-md:border max-md:border-border-color-strong max-md:bg-background-light max-md:shadow-lg';

export const manageMobileFloatingPillInsetClassName = 'max-md:px-3';

export const manageMobileFixedBottomChromeClassName =
  'max-md:fixed max-md:inset-x-0 max-sm:bottom-[calc(var(--mobile-nav-offset,4.5rem)+0.25rem)] sm:max-md:bottom-3';

export const manageMobileStickyChromeZClassName = 'max-md:z-30';

export const manageMobileChromeMediaQuery = '(max-width: 767px)';

/** Sliding active-tab pill — fill + inset highlight. */
export const mobileTabActivePillClassName =
  'bg-foreground/[0.14] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.55),inset_0_0_0_1px_rgba(0,0,0,0.07)] dark:bg-foreground/[0.12] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_0_0_1px_var(--selection-ring)]';

/** Active tab label (background lives on the sliding pill). */
export const mobileTabActiveClassName =
  'text-foreground/90 font-medium';

/** Duration for sequenced sticky-bar hide/show slides. Matches `.mobile-sticky-bar-slide`. */
export const STICKY_BAR_SLIDE_MS = 250;

export function getStickyBarSlideDurationMs() {
  if (typeof window === 'undefined') return 0;
  if (prefersReducedMotion()) return 0;
  if (!window.matchMedia('(max-width: 639px)').matches) return 0;
  return STICKY_BAR_SLIDE_MS;
}
