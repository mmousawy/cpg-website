/**
 * Scroll positioning that respects the sticky header.
 * Reads the header height directly for reliable offset calculation.
 */

function getHeaderOffset(): number {
  if (typeof window === 'undefined') return 0;
  const header = document.querySelector('header');
  if (header) return header.getBoundingClientRect().height + 16;
  return 112; // ~7rem fallback
}

export function scrollToIdWithStickyHeaderOffset(
  id: string,
  behavior: ScrollBehavior = 'smooth',
): boolean {
  if (typeof window === 'undefined') return false;

  const maxRetries = 20;
  const retryDelayMs = 50;

  const scrollToTarget = (remainingRetries: number): boolean => {
    const el = document.getElementById(id);
    if (!el) {
      if (remainingRetries <= 0) return false;
      window.setTimeout(() => {
        scrollToTarget(remainingRetries - 1);
      }, retryDelayMs);
      return true;
    }

    const offset = getHeaderOffset();
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior });
    return true;
  };

  return scrollToTarget(maxRetries);
}
