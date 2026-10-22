'use client';

import { type RefObject, useEffect, useLayoutEffect, useRef } from 'react';

import { useIsMobile } from '@/hooks/useIsMobile';
import { motionDuration } from '@/utils/reduceMotion';

const SKIP_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'file',
  'hidden',
  'image',
  'radio',
  'reset',
  'submit',
]);

function isDialogKeyboardField(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false;
  if (element.isContentEditable) return true;
  if (element instanceof HTMLTextAreaElement) return true;
  if (element instanceof HTMLSelectElement) return true;
  if (element instanceof HTMLInputElement) {
    return !SKIP_INPUT_TYPES.has(element.type);
  }
  return false;
}

function findScrollableAncestor(element: HTMLElement, boundary: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = element.parentElement;
  while (node && node !== boundary) {
    const { overflowY } = window.getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/** Skip sub-pixel noise. The keyboard is followed from its first frames. */
const KEYBOARD_OVERLAP_THRESHOLD = 24;

/** Scroll the field once the keyboard has stopped moving. */
const KEYBOARD_SETTLE_MS = 80;

/** Hold the closed modal's box until the fade finishes. */
const CLOSE_FREEZE_MS = 250;

const OVERLAY_CLOSE_START = 'overlay-close-start';
const OVERLAY_CLOSE_CANCEL = 'overlay-close-cancel';

/** Snapshot every open overlay before async close checks or the keyboard resize. */
export function beginOverlayClose() {
  if (typeof document === 'undefined') return;
  document.dispatchEvent(new Event(OVERLAY_CLOSE_START));
}

export function cancelOverlayClose() {
  if (typeof document === 'undefined') return;
  document.dispatchEvent(new Event(OVERLAY_CLOSE_CANCEL));
}

function clearOverlayInset(overlay: HTMLElement) {
  overlay.removeAttribute('data-keyboard-inset');
  overlay.removeAttribute('data-close-frozen');
  overlay.style.removeProperty('top');
  overlay.style.removeProperty('height');
  overlay.style.removeProperty('max-height');
  overlay.style.removeProperty('bottom');
  overlay.style.removeProperty('--vv-height');
}

/** Lock the box currently on screen so a growing viewport cannot stretch the close animation. */
function freezeOverlayBox(overlay: HTMLElement) {
  if (overlay.hasAttribute('data-close-frozen')) return;
  overlay.setAttribute('data-close-frozen', '');
  overlay.setAttribute('data-keyboard-inset', '');
  overlay.style.bottom = 'auto';

  if (overlay.style.height.endsWith('px')) {
    overlay.style.maxHeight = overlay.style.height;
    return;
  }

  const rect = overlay.getBoundingClientRect();
  if (rect.height <= 0) return;
  overlay.style.top = `${rect.top}px`;
  overlay.style.height = `${rect.height}px`;
  overlay.style.maxHeight = `${rect.height}px`;
}

function keyboardOverlap(viewport: VisualViewport): number {
  return Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
}

const FIELD_SCROLL_PADDING = 12;

function visibleScrollBounds(scrollParent: HTMLElement): { top: number; bottom: number } {
  const parentRect = scrollParent.getBoundingClientRect();
  let bottom = parentRect.bottom;
  const panel = scrollParent.closest('.modal-panel-in');
  const footer = panel?.querySelector('[data-modal-footer]');
  if (footer instanceof HTMLElement) {
    const fade = footer.querySelector('[data-modal-footer-fade]');
    const obstructTop = fade instanceof HTMLElement
      ? fade.getBoundingClientRect().top
      : footer.getBoundingClientRect().top;
    bottom = Math.min(bottom, obstructTop);
  }
  return {
    top: parentRect.top + FIELD_SCROLL_PADDING,
    bottom: bottom - FIELD_SCROLL_PADDING,
  };
}

function scrollFieldIntoDialog(
  element: HTMLElement,
  dialog: HTMLElement,
  viewport: VisualViewport,
) {
  const scrollParent = findScrollableAncestor(element, dialog);
  if (!scrollParent) return;

  const bounds = visibleScrollBounds(scrollParent);
  const top = Math.max(bounds.top, viewport.offsetTop + FIELD_SCROLL_PADDING);
  const bottom = Math.min(bounds.bottom, viewport.offsetTop + viewport.height - FIELD_SCROLL_PADDING);
  const elRect = element.getBoundingClientRect();
  if (elRect.bottom > bottom) {
    scrollParent.scrollTop += elRect.bottom - bottom;
  } else if (elRect.top < top) {
    scrollParent.scrollTop -= top - elRect.top;
  }
}

/**
 * On mobile, pins an open overlay to the visual viewport while a text control
 * inside it is focused. Geometry tracks the keyboard every frame (no CSS
 * transition — that fights the keyboard and jumps). The focused field is
 * scrolled once after the viewport stops changing.
 */
export function useDialogVisualViewport(
  overlayRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  options?: { reposition?: boolean },
) {
  const reposition = options?.reposition !== false;
  const isMobile = useIsMobile();
  const isOpenRef = useRef(isOpen);
  const closingRef = useRef(false);
  isOpenRef.current = isOpen;

  useLayoutEffect(() => {
    if (!isMobile || !reposition) return;

    const overlay = overlayRef.current;
    if (!overlay) return;

    if (isOpen) {
      closingRef.current = false;
      return;
    }

    closingRef.current = true;
    freezeOverlayBox(overlay);

    const timer = setTimeout(() => {
      clearOverlayInset(overlay);
    }, motionDuration(CLOSE_FREEZE_MS));

    return () => clearTimeout(timer);
  }, [overlayRef, isMobile, isOpen, reposition]);

  useEffect(() => {
    if (!isOpen || !isMobile) return;

    const overlay = overlayRef.current;
    const viewport = window.visualViewport;
    if (!overlay || !viewport) return;

    if (keyboardOverlap(viewport) < KEYBOARD_OVERLAP_THRESHOLD && !closingRef.current) {
      clearOverlayInset(overlay);
    }

    let scrollRaf = 0;
    let blurTimer: ReturnType<typeof setTimeout> | undefined;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;

    const focusedField = (): HTMLElement | null => {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement) || !overlay.contains(active)) return null;
      if (!isDialogKeyboardField(active)) return null;
      return active;
    };

    const clearInset = () => {
      if (closingRef.current) return;
      clearOverlayInset(overlay);
    };

    const applyInset = () => {
      overlay.setAttribute('data-keyboard-inset', '');
      overlay.style.top = `${viewport.offsetTop}px`;
      overlay.style.height = `${viewport.height}px`;
      overlay.style.bottom = 'auto';
      overlay.style.setProperty('--vv-height', `${viewport.height}px`);
      if (overlay.scrollTop !== 0) overlay.scrollTop = 0;
    };

    const revealFocusedField = () => {
      cancelAnimationFrame(scrollRaf);
      scrollRaf = requestAnimationFrame(() => {
        const current = focusedField();
        if (current) scrollFieldIntoDialog(current, overlay, viewport);
      });
    };

    const scheduleReveal = () => {
      if (settleTimer !== undefined) clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        settleTimer = undefined;
        revealFocusedField();
      }, KEYBOARD_SETTLE_MS);
    };

    const syncGeometry = () => {
      if (!reposition || closingRef.current) return false;

      const field = focusedField();
      if (!field || keyboardOverlap(viewport) < KEYBOARD_OVERLAP_THRESHOLD) {
        if (overlay.hasAttribute('data-keyboard-inset')) clearInset();
        return false;
      }

      applyInset();
      return true;
    };

    const onViewportChange = () => {
      const pinned = syncGeometry();
      if (pinned || !reposition) scheduleReveal();
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !overlay.contains(target)) return;
      if (!isDialogKeyboardField(target)) return;

      if (blurTimer !== undefined) {
        clearTimeout(blurTimer);
        blurTimer = undefined;
      }

      syncGeometry();
      revealFocusedField();
    };

    const onFocusOut = () => {
      blurTimer = setTimeout(() => {
        blurTimer = undefined;
        if (!isOpenRef.current || closingRef.current) return;
        if (!syncGeometry() && overlay.hasAttribute('data-keyboard-inset')) clearInset();
      }, 0);
    };

    const onCloseStart = () => {
      closingRef.current = true;
      freezeOverlayBox(overlay);
    };

    const onCloseCancel = () => {
      closingRef.current = false;
      overlay.removeAttribute('data-close-frozen');
      if (!syncGeometry()) clearInset();
    };

    overlay.addEventListener('focusin', onFocusIn);
    overlay.addEventListener('focusout', onFocusOut);
    viewport.addEventListener('resize', onViewportChange);
    viewport.addEventListener('scroll', onViewportChange);
    window.addEventListener('resize', onViewportChange);
    document.addEventListener(OVERLAY_CLOSE_START, onCloseStart);
    document.addEventListener(OVERLAY_CLOSE_CANCEL, onCloseCancel);

    return () => {
      overlay.removeEventListener('focusin', onFocusIn);
      overlay.removeEventListener('focusout', onFocusOut);
      viewport.removeEventListener('resize', onViewportChange);
      viewport.removeEventListener('scroll', onViewportChange);
      window.removeEventListener('resize', onViewportChange);
      document.removeEventListener(OVERLAY_CLOSE_START, onCloseStart);
      document.removeEventListener(OVERLAY_CLOSE_CANCEL, onCloseCancel);
      if (blurTimer !== undefined) clearTimeout(blurTimer);
      if (settleTimer !== undefined) clearTimeout(settleTimer);
      cancelAnimationFrame(scrollRaf);
      if (isOpenRef.current) clearInset();
    };
  }, [overlayRef, isMobile, isOpen, reposition]);
}
