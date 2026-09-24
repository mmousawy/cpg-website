'use client';

import { AppearanceChoice, AppearanceChoiceGrid } from '@/components/account/AppearanceChoice';
import type { PhotoCaptionsMode } from '@/utils/displayPreferences';

type PhotoCaptionsPickerProps = {
  value: PhotoCaptionsMode;
  onChange: (mode: PhotoCaptionsMode) => void;
};

export default function PhotoCaptionsPicker({ value, onChange }: PhotoCaptionsPickerProps) {
  return (
    <AppearanceChoiceGrid>
      <AppearanceChoice
        selected={value === 'hover'}
        onSelect={() => onChange('hover')}
        label="On hover"
        description="Titles appear when you point at a photo"
      >
          <div className="w-20 shrink-0 overflow-hidden rounded border border-border-color-strong bg-background">
            <div className="relative aspect-square bg-foreground/12">
              <div className="absolute inset-x-0 top-0 bg-linear-to-b from-black/30 to-transparent p-1.5 pb-4">
                <div className="h-1 w-3/4 rounded bg-foreground/25" />
              </div>
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="absolute right-1 bottom-1 size-7 fill-foreground/45"
              >
                <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35Z" />
              </svg>
            </div>
          </div>
      </AppearanceChoice>

      <AppearanceChoice
        selected={value === 'always'}
        onSelect={() => onChange('always')}
        label="Always"
        description="Titles and authors stay visible"
      >
          <div className="w-20 shrink-0 overflow-hidden rounded border border-border-color-strong bg-background">
            <div className="relative aspect-square bg-foreground/12">
              <div className="absolute inset-x-0 top-0 bg-linear-to-b from-black/30 to-transparent p-1.5 pb-4">
                <div className="h-1 w-3/4 rounded bg-foreground/25" />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/20 to-transparent p-1.5">
                <div className="flex items-center gap-1">
                  <div className="size-2 rounded-full bg-foreground/25" />
                  <div className="h-1 w-5 rounded bg-foreground/20" />
                </div>
              </div>
            </div>
          </div>
      </AppearanceChoice>
    </AppearanceChoiceGrid>
  );
}
