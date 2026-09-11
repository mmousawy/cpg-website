'use client';

import { useEffect, useState } from 'react';

import { POPOVER_ANIMATION_MS } from '../shared/AnimatedPopoverPanel';

type TabBarPopoverBackdropProps = {
  open: boolean;
  onClose: () => void;
};

export default function TabBarPopoverBackdrop({
  open,
  onClose,
}: TabBarPopoverBackdropProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let mountTimer: ReturnType<typeof setTimeout> | undefined;
    let animFrame: number | undefined;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    let unmountTimer: ReturnType<typeof setTimeout> | undefined;

    if (open) {
      mountTimer = setTimeout(() => {
        setShouldRender(true);
        animFrame = requestAnimationFrame(() => {
          requestAnimationFrame(() => setIsVisible(true));
        });
      }, 0);
    } else {
      closeTimer = setTimeout(() => setIsVisible(false), 0);
      unmountTimer = setTimeout(() => setShouldRender(false), POPOVER_ANIMATION_MS);
    }

    return () => {
      if (mountTimer) clearTimeout(mountTimer);
      if (animFrame) cancelAnimationFrame(animFrame);
      if (closeTimer) clearTimeout(closeTimer);
      if (unmountTimer) clearTimeout(unmountTimer);
    };
  }, [open]);

  if (!shouldRender) return null;

  return (
    <button
      type="button"
      aria-label="Close menu"
      className="pointer-events-auto fixed inset-0 z-0 bg-black/25"
      style={{
        opacity: isVisible ? 1 : 0,
        transition: `opacity ${POPOVER_ANIMATION_MS}ms ease-out`,
      }}
      onClick={onClose}
    />
  );
}
