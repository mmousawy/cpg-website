'use client';

/**
 * Freeze document scroll without `overflow: hidden` or `position: fixed` on
 * body. Those styles zero `window.scrollY`, hide the scrollbar, and jump
 * sticky chrome. Instead, block scroll-producing input and snap the window
 * back if something (focus, scrollIntoView) still moves it.
 */

const SCROLL_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  ' ',
  'Spacebar',
]);

const LOCK_ATTR = 'data-overlay-scroll-lock';

const listenerOpts: AddEventListenerOptions = { capture: true, passive: false };
const touchStartOpts: AddEventListenerOptions = { capture: true, passive: true };

type LockState = {
  lockCount: number;
  scrollX: number;
  scrollY: number;
  touchStartX: number;
  touchStartY: number;
  listenersBound: boolean;
};

const lockState: LockState = {
  lockCount: 0,
  scrollX: 0,
  scrollY: 0,
  touchStartX: 0,
  touchStartY: 0,
  listenersBound: false,
};

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function overflowAllowsScroll(value: string) {
  return value === 'auto' || value === 'scroll' || value === 'overlay';
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

function isButtonLike(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY') return true;
  const role = target.getAttribute('role');
  return role === 'button' || role === 'link';
}

function canElementScroll(el: HTMLElement, deltaX: number, deltaY: number) {
  const style = getComputedStyle(el);

  if (deltaY !== 0 && overflowAllowsScroll(style.overflowY) && el.scrollHeight > el.clientHeight + 1) {
    if (deltaY < 0) return el.scrollTop > 0;
    return el.scrollTop + el.clientHeight < el.scrollHeight - 1;
  }

  if (deltaX !== 0 && overflowAllowsScroll(style.overflowX) && el.scrollWidth > el.clientWidth + 1) {
    if (deltaX < 0) return el.scrollLeft > 0;
    return el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
  }

  return false;
}

function eventCanScrollInner(target: EventTarget | null, deltaX: number, deltaY: number) {
  let node: HTMLElement | null = target instanceof HTMLElement
    ? target
    : target instanceof Node
      ? target.parentElement
      : null;

  while (node && node !== document.body && node !== document.documentElement) {
    if (canElementScroll(node, deltaX, deltaY)) return true;
    node = node.parentElement;
  }

  return false;
}

function keyDelta(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowUp':
      return { x: 0, y: -1 };
    case 'ArrowDown':
      return { x: 0, y: 1 };
    case 'ArrowLeft':
      return { x: -1, y: 0 };
    case 'ArrowRight':
      return { x: 1, y: 0 };
    case 'PageUp':
    case 'Home':
      return { x: 0, y: -1 };
    case 'PageDown':
    case 'End':
      return { x: 0, y: 1 };
    case ' ':
    case 'Spacebar':
      return { x: 0, y: event.shiftKey ? -1 : 1 };
    default:
      return { x: 0, y: 0 };
  }
}

function restoreWindowScroll() {
  if (window.scrollX === lockState.scrollX && window.scrollY === lockState.scrollY) return;
  window.scrollTo(lockState.scrollX, lockState.scrollY);
}

function onWheel(event: WheelEvent) {
  if (event.ctrlKey) return;
  if (eventCanScrollInner(event.target, event.deltaX, event.deltaY)) return;
  event.preventDefault();
}

function onTouchStart(event: TouchEvent) {
  const touch = event.touches[0];
  if (!touch) return;
  lockState.touchStartX = touch.clientX;
  lockState.touchStartY = touch.clientY;
}

function onTouchMove(event: TouchEvent) {
  if (event.touches.length > 1) return;
  const touch = event.touches[0];
  if (!touch) return;
  const deltaX = lockState.touchStartX - touch.clientX;
  const deltaY = lockState.touchStartY - touch.clientY;
  if (eventCanScrollInner(event.target, deltaX, deltaY)) return;
  event.preventDefault();
}

function onKeyDown(event: KeyboardEvent) {
  if (!SCROLL_KEYS.has(event.key) || event.ctrlKey || event.metaKey || event.altKey) return;
  if (isEditableTarget(event.target)) return;
  if ((event.key === ' ' || event.key === 'Spacebar') && isButtonLike(event.target)) return;

  const delta = keyDelta(event);
  if (eventCanScrollInner(event.target, delta.x, delta.y)) return;
  event.preventDefault();
}

function onScroll() {
  restoreWindowScroll();
}

function bindListeners() {
  if (lockState.listenersBound) return;
  document.addEventListener('wheel', onWheel, listenerOpts);
  document.addEventListener('touchstart', onTouchStart, touchStartOpts);
  document.addEventListener('touchmove', onTouchMove, listenerOpts);
  document.addEventListener('keydown', onKeyDown, listenerOpts);
  window.addEventListener('scroll', onScroll, listenerOpts);
  document.addEventListener('scroll', onScroll, listenerOpts);
  document.documentElement.setAttribute(LOCK_ATTR, '');
  lockState.listenersBound = true;
}

function unbindListeners() {
  if (!lockState.listenersBound) return;
  document.removeEventListener('wheel', onWheel, listenerOpts);
  document.removeEventListener('touchstart', onTouchStart, touchStartOpts);
  document.removeEventListener('touchmove', onTouchMove, listenerOpts);
  document.removeEventListener('keydown', onKeyDown, listenerOpts);
  window.removeEventListener('scroll', onScroll, listenerOpts);
  document.removeEventListener('scroll', onScroll, listenerOpts);
  document.documentElement.removeAttribute(LOCK_ATTR);
  lockState.listenersBound = false;
}

/** `dialog.show()` can scroll the document to the dialog's layout box. */
export function showDialogWithoutScrolling(dialog: HTMLDialogElement | null) {
  if (!dialog || !isBrowser()) return;
  const { scrollX, scrollY } = window;
  dialog.show();
  window.scrollTo(scrollX, scrollY);
}

export function lockBodyScroll() {
  if (!isBrowser()) return;

  lockState.lockCount += 1;
  if (lockState.lockCount > 1) return;

  lockState.scrollX = window.scrollX;
  lockState.scrollY = window.scrollY;
  bindListeners();
}

function clearForeignScrollLocks() {
  const { body, documentElement } = document;

  // Radix Select / react-remove-scroll: `body[data-scroll-locked] { overflow: hidden !important }`
  body.removeAttribute('data-scroll-locked');
  documentElement.removeAttribute('data-scroll-locked');
  body.style.removeProperty('--removed-body-scroll-bar-size');
  documentElement.style.removeProperty('--removed-body-scroll-bar-size');
  body.classList.remove('with-scroll-bars-hidden');
  documentElement.classList.remove('with-scroll-bars-hidden');
  for (const cls of [...body.classList]) {
    if (cls.startsWith('block-interactivity-')) {
      body.classList.remove(cls);
    }
  }
}

export function unlockBodyScroll() {
  if (!isBrowser() || lockState.lockCount === 0) return;

  lockState.lockCount -= 1;
  if (lockState.lockCount > 0) return;

  unbindListeners();
  window.scrollTo(lockState.scrollX, lockState.scrollY);
}

/**
 * Drop every outstanding lock. Used on client navigations so a lock from a
 * previous route cannot stick. Does not restore scrollY — the new route owns
 * scroll position.
 */
export function resetBodyScrollLock() {
  if (!isBrowser()) return;

  lockState.lockCount = 0;
  unbindListeners();
  clearForeignScrollLocks();
}
