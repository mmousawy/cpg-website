'use client';

import { Control, Controller } from 'react-hook-form';

import AlbumCardStylePicker from '@/components/account/AlbumCardStylePicker';
import MotionPreferencePicker from '@/components/account/MotionPreferencePicker';
import PhotoCaptionsPicker from '@/components/account/PhotoCaptionsPicker';
import PhotoGridDensityPicker from '@/components/account/PhotoGridDensityPicker';
import PhotoGridStylePicker from '@/components/account/PhotoGridStylePicker';
import ThemePreferencePicker from '@/components/account/ThemePreferencePicker';
import Container from '@/components/layout/Container';
import type { AccountFormData } from '@/hooks/useAccountForm';

interface PreferencesSectionProps {
  control: Control<AccountFormData>;
  themeMounted: boolean;
}

export default function PreferencesSection({
  control,
  themeMounted,
}: PreferencesSectionProps) {
  return (
    <div>
      <h2
        className="mb-2 sm:mb-4 text-lg font-semibold opacity-80 font-heading"
      >
        Appearance
      </h2>
      <Container>
        <div
          className="space-y-6"
        >
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Theme</label>
            <Controller
              name="theme"
              control={control}
              render={({ field }) => (
                <ThemePreferencePicker
                  value={field.value}
                  onChange={field.onChange}
                  selectionReady={themeMounted}
                />
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Album card style</label>
            <Controller
              name="albumCardStyle"
              control={control}
              render={({ field }) => (
                <AlbumCardStylePicker value={field.value} onChange={field.onChange} />
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Photo grid style</label>
            <Controller
              name="photoGridStyle"
              control={control}
              render={({ field }) => (
                <PhotoGridStylePicker value={field.value} onChange={field.onChange} />
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Photo grid density</label>
            <Controller
              name="photoGridDensity"
              control={control}
              render={({ field }) => (
                <PhotoGridDensityPicker value={field.value} onChange={field.onChange} />
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Photo captions</label>
            <Controller
              name="photoCaptions"
              control={control}
              render={({ field }) => (
                <PhotoCaptionsPicker value={field.value} onChange={field.onChange} />
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Motion</label>
            <Controller
              name="motion"
              control={control}
              render={({ field }) => (
                <MotionPreferencePicker value={field.value} onChange={field.onChange} />
              )}
            />
          </div>
        </div>
      </Container>
    </div>
  );
}
