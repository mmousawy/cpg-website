'use client';

import clsx from 'clsx';

export type AlbumCardStyle = 'large' | 'compact';

type AlbumCardStylePickerProps = {
  value: AlbumCardStyle;
  onChange: (style: AlbumCardStyle) => void;
};

export default function AlbumCardStylePicker({ value, onChange }: AlbumCardStylePickerProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => onChange('large')}
        className={clsx(
          'rounded-lg border-2 p-3 text-left transition-colors',
          value === 'large'
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
                  value === 'large' ? 'border-primary' : 'border-border-color-strong',
                )}
              >
                {value === 'large' && (
                  <div className="size-2 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-sm font-medium">Large</span>
            </div>
            <p className="ml-6 text-xs text-foreground/50">Info visible below image</p>
          </div>
          <div className="w-20 shrink-0 overflow-hidden rounded border border-border-color-strong bg-background">
            <div className="h-12 bg-foreground/5" />
            <div className="border-t border-border-color-strong bg-background-light p-1.5">
              <div className="mb-1.5 h-1 w-4/5 rounded bg-foreground/20" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <div className="size-2 rounded-full bg-foreground/15" />
                  <div className="h-1 w-6 rounded bg-foreground/10" />
                </div>
                <div className="h-1 w-4 rounded bg-foreground/10" />
              </div>
            </div>
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
            <p className="ml-6 text-xs text-foreground/50">Info shown on hover</p>
          </div>
          <div className="w-20 shrink-0 overflow-hidden rounded border border-border-color-strong bg-background">
            <div className="relative h-[4.75rem] bg-foreground/5">
              <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-background-light to-transparent p-1.5">
                <div className="h-1 w-3/4 rounded bg-foreground/25" />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background-light to-transparent p-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <div className="size-2 rounded-full bg-foreground/20" />
                    <div className="h-1 w-5 rounded bg-foreground/15" />
                  </div>
                  <div className="h-1 w-4 rounded bg-foreground/15" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}
