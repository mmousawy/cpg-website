'use client';

import { motionDuration } from '@/utils/reduceMotion';
import clsx from 'clsx';
import { useEffect, useState } from 'react';

export const POPOVER_ANIMATION_MS = 120;

type AnimatedPopoverPanelProps = {
  open: boolean;
  className?: string;
  role?: string;
  /** `top-right` for menus that open downward from a trigger. */
  origin?: 'center' | 'right' | 'top-right';
  children: React.ReactNode;
};

export default function AnimatedPopoverPanel({
  open,
  className,
  role = 'menu',
  origin = 'center',
  children,
}: AnimatedPopoverPanelProps) {
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
      unmountTimer = setTimeout(() => setShouldRender(false), motionDuration(POPOVER_ANIMATION_MS));
    }

    return () => {
      if (mountTimer) clearTimeout(mountTimer);
      if (animFrame) cancelAnimationFrame(animFrame);
      if (closeTimer) clearTimeout(closeTimer);
      if (unmountTimer) clearTimeout(unmountTimer);
    };
  }, [open]);

  if (!shouldRender) return null;

  const opensDownward = origin === 'top-right';
  const closedTransform = opensDownward ? 'translateY(-8px) scale(0.96)' : 'translateY(8px) scale(0.96)';
  const openTransform = 'translateY(0) scale(1)';
  const transformOrigin = opensDownward
    ? 'top right'
    : origin === 'right'
      ? 'bottom right'
      : 'bottom center';

  return (
    <div
      role={role}
      className={clsx(className)}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? openTransform : closedTransform,
        transformOrigin,
        transition: `opacity ${motionDuration(POPOVER_ANIMATION_MS)}ms ease-out, transform ${motionDuration(POPOVER_ANIMATION_MS)}ms ease-out`,
      }}
    >
      {children}
    </div>
  );
}
