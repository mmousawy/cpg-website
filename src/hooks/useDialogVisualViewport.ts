'use client';

import { type RefObject, useEffect } from 'react';

import { useIsMobile } from '@/hooks/useIsMobile';

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
    if (
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
      && node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/** Skip sub-pixel noise. The keyboard is followed from its first frames. */
const KEYBOARD_OVERLAP_THRESHOLD = 24;

function keyboardOverlap(viewport: VisualViewport): number {
  return Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
}

function scrollFieldIntoDialog(element: HTMLElement, dialog: HTMLElement) {
  const scrollParent = findScrollableAncestor(element, dialog);
  if (!scrollParent) return;

  const parentRect = scrollParent.getBoundingClientRect();
  const elRect = element.getBoundingClientRect();
  if (elRect.bottom > parentRect.bottom) {
    scrollParent.scrollTop += elRect.bottom - parentRect.bottom;
  } else if (elRect.top < parentRect.top) {
    scrollParent.scrollTop -= parentRect.top - elRect.top;
  }
}

/**
 * On mobile, pins an open `<dialog>` to the visual viewport while a text control
 * inside it is focused so the modal stays above the on-screen keyboard.
 */
export function useDialogVisualViewport(
  dialogRef: RefObject<HTMLDialogElement | null>,
  isOpen: boolean,
) {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isOpen || !isMobile) return;

    const dialog = dialogRef.current;
    const viewport = window.visualViewport;
    if (!dialog || !viewport) return;

    let scrollRaf = 0;
    let blurTimer: ReturnType<typeof setTimeout> | undefined;

    const focusedField = (): HTMLElement | null => {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement) || !dialog.contains(active)) return null;
      if (!isDialogKeyboardField(active)) return null;
      return active;
    };

    const clearInset = () => {
      dialog.removeAttribute('data-keyboard-inset');
      dialog.style.removeProperty('top');
      dialog.style.removeProperty('height');
      dialog.style.removeProperty('bottom');
      dialog.style.removeProperty('--vv-height');
    };

    const applyInset = () => {
      const top = `${viewport.offsetTop}px`;
      const height = `${viewport.height}px`;
      if (
        dialog.getAttribute('data-keyboard-inset') !== null
        && dialog.style.top === top
        && dialog.style.height === height
      ) {
        return false;
      }

      dialog.setAttribute('data-keyboard-inset', '');
      dialog.style.top = top;
      dialog.style.height = height;
      dialog.style.setProperty('--vv-height', `${viewport.height}px`);
      return true;
    };

    const sync = () => {
      const field = focusedField();
      if (!field || keyboardOverlap(viewport) < KEYBOARD_OVERLAP_THRESHOLD) {
        if (dialog.hasAttribute('data-keyboard-inset')) clearInset();
        return;
      }

      if (!applyInset()) return;

      cancelAnimationFrame(scrollRaf);
      scrollRaf = requestAnimationFrame(() => {
        const current = focusedField();
        if (current) scrollFieldIntoDialog(current, dialog);
      });
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !dialog.contains(target)) return;
      if (!isDialogKeyboardField(target)) return;

      if (blurTimer !== undefined) {
        clearTimeout(blurTimer);
        blurTimer = undefined;
      }

      sync();
    };

    const onFocusOut = () => {
      blurTimer = setTimeout(() => {
        blurTimer = undefined;
        sync();
      }, 0);
    };

    dialog.addEventListener('focusin', onFocusIn);
    dialog.addEventListener('focusout', onFocusOut);
    viewport.addEventListener('resize', sync);
    viewport.addEventListener('scroll', sync);

    return () => {
      dialog.removeEventListener('focusin', onFocusIn);
      dialog.removeEventListener('focusout', onFocusOut);
      viewport.removeEventListener('resize', sync);
      viewport.removeEventListener('scroll', sync);
      if (blurTimer !== undefined) clearTimeout(blurTimer);
      cancelAnimationFrame(scrollRaf);
      clearInset();
    };
  }, [dialogRef, isMobile, isOpen]);
}
