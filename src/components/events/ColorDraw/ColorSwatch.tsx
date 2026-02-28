'use client';

import clsx from 'clsx';
import { getColorLabel, getColorSwatchStyle } from '@/lib/colorDraw';

type ColorSwatchProps = {
  color: string;
  size?: 'sm' | 'md';
  onClick?: () => void;
  className?: string;
};

export default function ColorSwatch({ color, size = 'md', onClick, className }: ColorSwatchProps) {
  const style = getColorSwatchStyle(color);
  const label = getColorLabel(color);
  const isClickable = !!onClick;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isClickable}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-full transition-opacity',
        isClickable && 'cursor-pointer hover:opacity-90 active:scale-95',
        !isClickable && 'cursor-default',
        size === 'sm' && 'size-6',
        size === 'md' && 'size-8',
        className,
      )}
      style={style}
      title={isClickable ? `View ${label} fullscreen` : undefined}
      aria-label={`Color: ${label}`}
    />
  );
}
