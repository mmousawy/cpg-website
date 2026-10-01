'use client';

import { AppearanceChoice, AppearanceChoiceGrid } from '@/components/account/AppearanceChoice';

export type AlbumCardStyle = 'large' | 'compact';

type AlbumCardStylePickerProps = {
  value: AlbumCardStyle;
  onChange: (style: AlbumCardStyle) => void;
};

export default function AlbumCardStylePicker({ value, onChange }: AlbumCardStylePickerProps) {
  return (
    <AppearanceChoiceGrid>
      <AppearanceChoice
        selected={value === 'large'}
        onSelect={() => onChange('large')}
        label="Large"
        description="Info visible below image"
      >
        <div className="w-20 shrink-0 overflow-hidden rounded border border-border-color-strong bg-background">
            <div className="h-12 bg-foreground/12" />
            <div className="border-t border-border-color-strong bg-background-light bg-no-noise p-1.5">
              <div className="mb-1.5 h-1 w-4/5 rounded bg-foreground/25" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <div className="size-2 rounded-full bg-foreground/25" />
                  <div className="h-1 w-6 rounded bg-foreground/20" />
                </div>
                <div className="h-1 w-4 rounded bg-foreground/20" />
              </div>
            </div>
        </div>
      </AppearanceChoice>

      <AppearanceChoice
        selected={value === 'compact'}
        onSelect={() => onChange('compact')}
        label="Compact"
        description="Info shown on hover"
      >
        <div className="w-20 shrink-0 overflow-hidden rounded border border-border-color-strong bg-background">
            <div className="relative aspect-square bg-foreground/12">
              <div className="absolute inset-x-0 top-0 bg-linear-to-b from-black/30 to-transparent p-1.5 pb-4">
                <div className="h-1 w-3/4 rounded bg-foreground/25" />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/20 to-transparent p-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <div className="size-2 rounded-full bg-foreground/25" />
                    <div className="h-1 w-5 rounded bg-foreground/20" />
                  </div>
                  <div className="h-1 w-4 rounded bg-foreground/20" />
                </div>
              </div>
            </div>
        </div>
      </AppearanceChoice>
    </AppearanceChoiceGrid>
  );
}
