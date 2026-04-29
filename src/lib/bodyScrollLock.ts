'use client';

type BodyStyleSnapshot = {
  overflow: string;
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
  paddingRight: string;
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
  };

  const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
  body.style.overflow = 'hidden';
  body.style.position = 'fixed';
  body.style.top = `-${lockState.scrollY}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${scrollbarWidth}px`;
  }
}

export function unlockBodyScroll() {
  if (!isBrowser() || lockState.lockCount === 0) return;

  lockState.lockCount -= 1;
  if (lockState.lockCount > 0) return;

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
  } else {
    body.style.overflow = '';
    body.style.position = '';
    body.style.top = '';
    body.style.left = '';
    body.style.right = '';
    body.style.width = '';
    body.style.paddingRight = '';
  }

  window.scrollTo(0, lockState.scrollY);
  lockState.bodyStyle = null;
  lockState.scrollY = 0;
}
