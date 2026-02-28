'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

import CloseSVG from 'public/icons/close.svg';
import { getColorLabel, getColorSwatchStyle, isLightColor } from '@/lib/colorDraw';

function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

type ColorFullscreenProps = {
  color: string;
  isOpen: boolean;
  onClose: () => void;
};

export default function ColorFullscreen({ color, isOpen, onClose }: ColorFullscreenProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, handleEscape]);

  const mounted = useIsMounted();

  if (!isOpen) return null;

  const label = getColorLabel(color);
  const light = isLightColor(color);
  const baseStyle = getColorSwatchStyle(color);

  const fullViewportStyle = { minHeight: '100dvh' };
  const overlay = (
    <div
      className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center"
      style={fullViewportStyle}
      role="dialog"
      aria-modal="true"
      aria-label={`Fullscreen view of ${label}`}
    >
      {/* Full viewport color background - click to close */}
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        style={{ ...baseStyle, ...fullViewportStyle }}
        onClick={onClose}
        aria-label="Close overlay"
      />

      {/* Close button - top right */}
      <button
        type="button"
        onClick={onClose}
        className={clsx(
          'absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full transition-opacity hover:opacity-80',
          light ? 'bg-black/20 text-black' : 'bg-white/20 text-white',
        )}
        aria-label="Close"
      >
        <CloseSVG
          className="size-6"
        />
      </button>

      {/* Color name - centered, click does not close */}
      <div
        className="relative z-10 flex flex-col items-center justify-center px-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className={clsx(
            'text-4xl font-bold drop-shadow-lg sm:text-5xl md:text-6xl',
            light ? 'text-black' : 'text-white',
          )}
        >
          {label}
        </h2>
      </div>
    </div>
  );

  return mounted ? createPortal(overlay, document.body) : null;
}
