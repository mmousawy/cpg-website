'use client';

import { AppearanceChoice, AppearanceChoiceGrid } from '@/components/account/AppearanceChoice';
import type { PhotoGridDensity } from '@/utils/displayPreferences';

type PhotoGridDensityPickerProps = {
  value: PhotoGridDensity;
  onChange: (density: PhotoGridDensity) => void;
};

export default function PhotoGridDensityPicker({ value, onChange }: PhotoGridDensityPickerProps) {
  return (
    <AppearanceChoiceGrid>
      <AppearanceChoice
        selected={value === 'comfortable'}
        onSelect={() => onChange('comfortable')}
        label="Comfortable"
        description="Larger previews"
      >
          <div className="grid aspect-square w-20 shrink-0 grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded bg-foreground/5 p-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-sm bg-foreground/20"
              />
            ))}
          </div>
      </AppearanceChoice>

      <AppearanceChoice
        selected={value === 'compact'}
        onSelect={() => onChange('compact')}
        label="Compact"
        description="More photos on screen"
      >
          <div className="grid aspect-square w-20 shrink-0 grid-cols-3 gap-0.5 overflow-hidden rounded bg-foreground/5 p-1.5">
            {Array.from({ length: 9 }).map((_, i) => (
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
