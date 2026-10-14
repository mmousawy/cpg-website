/** Mark portaled UI (autocomplete, select menus) so modal focus traps still receive clicks. */
export const PORTAL_OVERLAY_ATTR = 'data-portal-overlay';

export function isPortalOverlayClick(event: MouseEvent | TouchEvent): boolean {
  const target = event.target;
  if (!(target instanceof Element)) {
    return false;
  }
  return target.closest(`[${PORTAL_OVERLAY_ATTR}]`) !== null;
}

/**
 * Portal target for floating UI tied to an anchor element.
 * Only uses a `<dialog>` when the anchor lives inside an open dialog (never a random open dialog elsewhere).
 */
export function getOverlayPortalRoot(anchor?: HTMLElement | null): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const dialog = anchor?.closest('dialog');
  if (dialog instanceof HTMLDialogElement && dialog.open) {
    return dialog;
  }
  return document.body;
}
