'use client';

type BodyStyleSnapshot = {
  overflow: string;
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
  paddingRight: string;
  height: string;
};

type LockState = {
  lockCount: number;
  scrollY: number;
  bodyStyle: BodyStyleSnapshot | null;
};

const lockState: LockState = {
  lockCount: 0,
  scrollY: 0,
  bodyStyle: null,
};

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function lockBodyScroll() {
  if (!isBrowser()) return;

  lockState.lockCount += 1;
  if (lockState.lockCount > 1) return;

  const { body, documentElement } = document;
  lockState.scrollY = window.scrollY;
  lockState.bodyStyle = {
    overflow: body.style.overflow,
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
    paddingRight: body.style.paddingRight,
    height: body.style.height,
  };

  const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
  body.style.overflow = 'hidden';
  body.style.position = 'fixed';
  body.style.top = `-${lockState.scrollY}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
  body.style.height = 'auto';
  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${scrollbarWidth}px`;
  }
}

function restoreBodyStyle() {
  const { body } = document;
  const snapshot = lockState.bodyStyle;

  if (snapshot) {
    body.style.overflow = snapshot.overflow;
    body.style.position = snapshot.position;
    body.style.top = snapshot.top;
    body.style.left = snapshot.left;
    body.style.right = snapshot.right;
    body.style.width = snapshot.width;
    body.style.paddingRight = snapshot.paddingRight;
    body.style.height = snapshot.height;
  } else {
    body.style.overflow = '';
    body.style.position = '';
    body.style.top = '';
    body.style.left = '';
    body.style.right = '';
    body.style.width = '';
    body.style.paddingRight = '';
    body.style.height = '';
  }

  lockState.bodyStyle = null;
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

  restoreBodyStyle();
  window.scrollTo(0, lockState.scrollY);
  lockState.scrollY = 0;
}

/**
 * Drop every outstanding lock and restore inline body styles.
 * Used on client navigations so a lock from a previous route cannot stick.
 * Does not restore scrollY — the new route owns scroll position.
 */
export function resetBodyScrollLock() {
  if (!isBrowser()) return;

  lockState.lockCount = 0;
  lockState.scrollY = 0;
  restoreBodyStyle();
  clearForeignScrollLocks();
}
