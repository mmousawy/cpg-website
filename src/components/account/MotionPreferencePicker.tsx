'use client';

import clsx from 'clsx';

import { AppearanceChoice, AppearanceChoiceGrid } from '@/components/account/AppearanceChoice';
import type { MotionPreference } from '@/utils/displayPreferences';

type MotionPreferencePickerProps = {
  value: MotionPreference;
  onChange: (motion: MotionPreference) => void;
};

const MOTION_FRAMES = [
  {
    position: 'left-6.5 top-6.5',
    fill: 'bg-[color-mix(in_srgb,var(--foreground)_15%,var(--background-light))] dark:bg-[color-mix(in_srgb,var(--foreground)_15%,var(--background-light))]',
  },
  {
    position: 'left-8.75 top-8.75',
    fill: 'bg-[color-mix(in_srgb,var(--foreground)_25%,var(--background-light))] dark:bg-[color-mix(in_srgb,var(--foreground)_25%,var(--background-light))]',
    ghost: 'border-[color-mix(in_srgb,var(--foreground)_25%,transparent)]',
  },
  {
    position: 'left-11.25 top-11.25',
    fill: 'bg-[color-mix(in_srgb,var(--foreground)_35%,var(--background-light))] dark:bg-[color-mix(in_srgb,var(--foreground)_35%,var(--background-light))]',
    ghost: 'border-[color-mix(in_srgb,var(--foreground)_35%,transparent)]',
  },
  {
    position: 'left-13.5 top-13.5',
    fill: 'bg-[color-mix(in_srgb,var(--foreground)_45%,var(--background-light))] dark:bg-[color-mix(in_srgb,var(--foreground)_45%,var(--background-light))]',
  },
] as const;

function MotionWireframe({ showMiddle }: { showMiddle: boolean }) {
  return (
    <div
      className="relative aspect-square w-20 shrink-0 rounded bg-foreground/5"
    >
      {MOTION_FRAMES.map((frame) => {
        const ghost = !showMiddle && 'ghost' in frame;

        return (
          <div
            key={frame.position}
            className={clsx(
              'absolute size-9 -translate-x-1/2 -translate-y-1/2 rounded-sm',
              frame.position,
              ghost ? clsx('border border-dashed bg-transparent', frame.ghost) : frame.fill,
            )}
          />
        );
      })}
    </div>
  );
}

export default function MotionPreferencePicker({ value, onChange }: MotionPreferencePickerProps) {
  return (
    <AppearanceChoiceGrid>
      <AppearanceChoice
        selected={value === 'system'}
        onSelect={() => onChange('system')}
        label="System"
        description="Follow your device motion setting"
      >
        <MotionWireframe
          showMiddle
        />
      </AppearanceChoice>

      <AppearanceChoice
        selected={value === 'reduce'}
        onSelect={() => onChange('reduce')}
        label="Reduce"
        description="Minimize animations and transitions"
      >
        <MotionWireframe
          showMiddle={false}
        />
      </AppearanceChoice>
    </AppearanceChoiceGrid>
  );
}
