'use client';

import clsx from 'clsx';

import type { MotionPreference } from '@/utils/displayPreferences';

type MotionPreferencePickerProps = {
  value: MotionPreference;
  onChange: (motion: MotionPreference) => void;
};

export default function MotionPreferencePicker({ value, onChange }: MotionPreferencePickerProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => onChange('system')}
        className={clsx(
          'rounded-lg border-2 p-3 text-left transition-colors',
          value === 'system'
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
                  value === 'system' ? 'border-primary' : 'border-border-color-strong',
                )}
              >
                {value === 'system' && (
                  <div className="size-2 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-sm font-medium">System</span>
            </div>
            <p className="ml-6 text-xs text-foreground/50">Follow your device motion setting</p>
          </div>
          <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded border border-border-color-strong bg-background p-2">
            <div className="absolute left-2 top-3 size-6 rounded-sm bg-foreground/20" />
            <div className="absolute left-4 top-4 size-6 rounded-sm bg-foreground/10" />
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onChange('reduce')}
        className={clsx(
          'rounded-lg border-2 p-3 text-left transition-colors',
          value === 'reduce'
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
                  value === 'reduce' ? 'border-primary' : 'border-border-color-strong',
                )}
              >
                {value === 'reduce' && (
                  <div className="size-2 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-sm font-medium">Reduce</span>
            </div>
            <p className="ml-6 text-xs text-foreground/50">Minimize animations and transitions</p>
          </div>
          <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded border border-border-color-strong bg-background p-2">
            <div className="absolute left-3 top-3 size-6 rounded-sm bg-foreground/20" />
          </div>
        </div>
      </button>
    </div>
  );
}
