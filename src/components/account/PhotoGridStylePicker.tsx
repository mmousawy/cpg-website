'use client';

import { AppearanceChoice, AppearanceChoiceGrid } from '@/components/account/AppearanceChoice';
import type { PhotoGridStyle } from '@/utils/displayPreferences';

type PhotoGridStylePickerProps = {
  value: PhotoGridStyle;
  onChange: (style: PhotoGridStyle) => void;
};

export default function PhotoGridStylePicker({ value, onChange }: PhotoGridStylePickerProps) {
  return (
    <AppearanceChoiceGrid>
      <AppearanceChoice
        selected={value === 'justified'}
        onSelect={() => onChange('justified')}
        label="Justified"
        description="Rows fit the width of each photo"
      >
          <div className="flex aspect-square w-20 shrink-0 flex-col gap-0.5 overflow-hidden rounded bg-foreground/5 p-1.5">
            <div className="flex min-h-0 flex-[1.15] gap-0.5">
              <div className="min-w-0 flex-[1.4] rounded-[1px] bg-foreground/20" />
              <div className="min-w-0 flex-[0.65] rounded-[1px] bg-foreground/20" />
              <div className="min-w-0 flex-1 rounded-[1px] bg-foreground/20" />
            </div>
            <div className="flex min-h-0 flex-1 gap-0.5">
              <div className="min-w-0 flex-[0.85] rounded-[1px] bg-foreground/20" />
              <div className="min-w-0 flex-[1.55] rounded-[1px] bg-foreground/20" />
            </div>
            <div className="flex min-h-0 flex-[0.9] gap-0.5">
              <div className="min-w-0 flex-[1.1] rounded-[1px] bg-foreground/20" />
              <div className="min-w-0 flex-[0.7] rounded-[1px] bg-foreground/20" />
              <div className="min-w-0 flex-1 rounded-[1px] bg-foreground/20" />
            </div>
          </div>
      </AppearanceChoice>

      <AppearanceChoice
        selected={value === 'square'}
        onSelect={() => onChange('square')}
        label="Square"
        description="Uniform square tiles"
      >
          <div className="grid aspect-square w-20 shrink-0 grid-cols-2 gap-0.5 overflow-hidden rounded bg-foreground/5 p-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-sm bg-foreground/20"
              />
            ))}
          </div>
      </AppearanceChoice>
    </AppearanceChoiceGrid>
  );
}
