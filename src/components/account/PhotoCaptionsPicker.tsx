'use client';

import clsx from 'clsx';

import type { PhotoCaptionsMode } from '@/utils/displayPreferences';

type PhotoCaptionsPickerProps = {
  value: PhotoCaptionsMode;
  onChange: (mode: PhotoCaptionsMode) => void;
};

export default function PhotoCaptionsPicker({ value, onChange }: PhotoCaptionsPickerProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => onChange('hover')}
        className={clsx(
          'rounded-lg border-2 p-3 text-left transition-colors',
          value === 'hover'
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
                  value === 'hover' ? 'border-primary' : 'border-border-color-strong',
                )}
              >
                {value === 'hover' && (
                  <div className="size-2 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-sm font-medium">On hover</span>
            </div>
            <p className="ml-6 text-xs text-foreground/50">Titles appear when you point at a photo</p>
          </div>
          <div className="h-12 w-20 shrink-0 overflow-hidden rounded border border-border-color-strong bg-foreground/10" />
        </div>
      </button>

      <button
        type="button"
        onClick={() => onChange('always')}
        className={clsx(
          'rounded-lg border-2 p-3 text-left transition-colors',
          value === 'always'
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
                  value === 'always' ? 'border-primary' : 'border-border-color-strong',
                )}
              >
                {value === 'always' && (
                  <div className="size-2 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-sm font-medium">Always</span>
            </div>
            <p className="ml-6 text-xs text-foreground/50">Titles and authors stay visible</p>
          </div>
          <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded border border-border-color-strong bg-foreground/10">
            <div className="absolute inset-x-0 top-0 bg-linear-to-b from-background-light to-transparent p-1">
              <div className="h-1 w-3/4 rounded bg-foreground/25" />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-background-light to-transparent p-1">
              <div className="flex items-center gap-0.5">
                <div className="size-1.5 rounded-full bg-foreground/20" />
                <div className="h-1 w-5 rounded bg-foreground/15" />
              </div>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}
