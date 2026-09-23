'use client';

import clsx from 'clsx';

import type { PhotoGridDensity } from '@/utils/displayPreferences';

type PhotoGridDensityPickerProps = {
  value: PhotoGridDensity;
  onChange: (density: PhotoGridDensity) => void;
};

export default function PhotoGridDensityPicker({ value, onChange }: PhotoGridDensityPickerProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => onChange('comfortable')}
        className={clsx(
          'rounded-lg border-2 p-3 text-left transition-colors',
          value === 'comfortable'
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
                  value === 'comfortable' ? 'border-primary' : 'border-border-color-strong',
                )}
              >
                {value === 'comfortable' && (
                  <div className="size-2 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-sm font-medium">Comfortable</span>
            </div>
            <p className="ml-6 text-xs text-foreground/50">Larger previews</p>
          </div>
          <div className="flex h-12 w-20 shrink-0 items-end gap-1 overflow-hidden rounded border border-border-color-strong bg-background p-1.5">
            <div className="h-8 w-7 rounded-sm bg-foreground/18" />
            <div className="h-8 w-7 rounded-sm bg-foreground/18" />
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onChange('compact')}
        className={clsx(
          'rounded-lg border-2 p-3 text-left transition-colors',
          value === 'compact'
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
                  value === 'compact' ? 'border-primary' : 'border-border-color-strong',
                )}
              >
                {value === 'compact' && (
                  <div className="size-2 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-sm font-medium">Compact</span>
            </div>
            <p className="ml-6 text-xs text-foreground/50">More photos on screen</p>
          </div>
          <div className="grid h-12 w-20 shrink-0 grid-cols-3 gap-0.5 overflow-hidden rounded border border-border-color-strong bg-background p-1">
            {Array.from({ length: 6 }).map((_, i) => (
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
