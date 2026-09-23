'use client';

import clsx from 'clsx';

import type { PhotoGridStyle } from '@/utils/displayPreferences';

type PhotoGridStylePickerProps = {
  value: PhotoGridStyle;
  onChange: (style: PhotoGridStyle) => void;
};

export default function PhotoGridStylePicker({ value, onChange }: PhotoGridStylePickerProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => onChange('justified')}
        className={clsx(
          'rounded-lg border-2 p-3 text-left transition-colors',
          value === 'justified'
            ? 'border-primary bg-primary/5'
            : 'border-border-color hover:border-border-color-strong',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <div
                className={clsx(
                  'flex size-4 shrink-0 items-center justify-center rounded-full border-2',
                  value === 'justified' ? 'border-primary' : 'border-border-color-strong',
                )}
              >
                {value === 'justified' && (
                  <div className="size-2 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-sm font-medium">Justified</span>
            </div>
            <p className="ml-6 text-xs text-foreground/50">Rows fit the width of each photo</p>
          </div>
          <div className="flex h-12 w-20 shrink-0 items-end gap-0.5 overflow-hidden rounded border border-border-color-strong bg-background p-1">
            <div className="h-7 w-5 rounded-sm bg-foreground/15" />
            <div className="h-9 w-7 rounded-sm bg-foreground/20" />
            <div className="h-6 w-4 rounded-sm bg-foreground/12" />
            <div className="h-8 w-6 rounded-sm bg-foreground/18" />
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onChange('square')}
        className={clsx(
          'rounded-lg border-2 p-3 text-left transition-colors',
          value === 'square'
            ? 'border-primary bg-primary/5'
            : 'border-border-color hover:border-border-color-strong',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <div
                className={clsx(
                  'flex size-4 shrink-0 items-center justify-center rounded-full border-2',
                  value === 'square' ? 'border-primary' : 'border-border-color-strong',
                )}
              >
                {value === 'square' && (
                  <div className="size-2 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-sm font-medium">Square</span>
            </div>
            <p className="ml-6 text-xs text-foreground/50">Uniform square tiles</p>
          </div>
          <div className="grid h-12 w-20 shrink-0 grid-cols-2 gap-0.5 overflow-hidden rounded border border-border-color-strong bg-background p-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-sm bg-foreground/15"
              />
            ))}
          </div>
        </div>
      </button>
    </div>
  );
}
