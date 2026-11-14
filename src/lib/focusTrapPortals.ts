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
 * When the anchor lives in a `<dialog>`, portal into that dialog's panel (not `document.body`)
 * so focus traps work and closing the dialog does not leave overlays on the page.
 */
export function getOverlayPortalRoot(anchor?: HTMLElement | null): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const dialog = anchor?.closest('dialog');
  if (dialog instanceof HTMLDialogElement) {
    // Keep portaled controls inside the FocusTrap panel (dialog children outside the trap
    // cannot receive or keep focus even with allowOutsideClick).
    const trapPanel = anchor?.closest('[data-modal-scroll-body]')?.parentElement;
    if (trapPanel instanceof HTMLElement) {
      return trapPanel;
    }
    return dialog;
  }
  return document.body;
}

/** Whether a portaled overlay anchored to `anchor` should render (hide when a host dialog closed). */
export function shouldShowPortalOverlay(anchor?: HTMLElement | null): boolean {
  const dialog = anchor?.closest('dialog');
  if (!(dialog instanceof HTMLDialogElement)) {
    return true;
  }
  return dialog.open;
}

export function portalRootUsesAbsolutePositioning(portalRoot: HTMLElement): boolean {
  return portalRoot !== document.body;
}

/**
 * Map viewport (client) coordinates to `top`/`left` for an overlay portaled under `portalRoot`.
 * `fixed` on `document.body` uses client coords; inside a modal panel (transform ancestor) use `absolute`.
 */
export function viewportAnchorToPortalPosition(
  viewportX: number,
  viewportY: number,
  portalRoot: HTMLElement,
): { top: number; left: number; position: 'fixed' | 'absolute' } {
  if (!portalRootUsesAbsolutePositioning(portalRoot)) {
    return { top: viewportY, left: viewportX, position: 'fixed' };
  }
  const rootRect = portalRoot.getBoundingClientRect();
  return {
    top: viewportY - rootRect.top,
    left: viewportX - rootRect.left,
    position: 'absolute',
  };
}

/** Lay out a floating box near a viewport anchor, clamped within the portal root box. */
export function layoutViewportAnchoredOverlay(
  anchorViewportX: number,
  anchorViewportY: number,
  overlayWidth: number,
  overlayHeight: number,
  portalRoot: HTMLElement,
  options?: { gap?: number; margin?: number },
): { top: number; left: number; position: 'fixed' | 'absolute' } {
  const gap = options?.gap ?? 10;
  const margin = options?.margin ?? 8;
  const useAbsolute = portalRootUsesAbsolutePositioning(portalRoot);
  const rootRect = useAbsolute
    ? portalRoot.getBoundingClientRect()
    : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

  const boundsW = useAbsolute ? rootRect.width : window.innerWidth;
  const boundsH = useAbsolute ? rootRect.height : window.innerHeight;
  const anchorX = anchorViewportX - rootRect.left;
  const anchorY = anchorViewportY - rootRect.top;

  let left = anchorX - overlayWidth / 2;
  let top = anchorY + gap;
  if (top + overlayHeight > boundsH - margin) {
    top = anchorY - overlayHeight - gap;
  }
  left = Math.min(Math.max(margin, left), Math.max(margin, boundsW - overlayWidth - margin));
  top = Math.min(Math.max(margin, top), Math.max(margin, boundsH - overlayHeight - margin));

  return {
    top,
    left,
    position: useAbsolute ? 'absolute' : 'fixed',
  };
}
