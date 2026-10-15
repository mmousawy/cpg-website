'use client';

import { useCallback } from 'react';
import type { UseFormSetValue, UseFormWatch } from 'react-hook-form';

import type { OnboardingFormData } from '@/app/onboarding/onboardingSchema';
import DailyDriverField from '@/components/gear/DailyDriverField';
import ShootingFormatTiles from '@/components/gear/ShootingFormatTiles';
import Container from '@/components/layout/Container';
import OnboardingSectionTitle from '@/components/onboarding/OnboardingSectionTitle';
import { GEAR_CATEGORY_LABELS, type ShootingFormat } from '@/lib/gear/types';
import CameraLensSVG from 'public/icons/camera-lens.svg';
import PhotoCameraSVG from 'public/icons/photo-camera.svg';

interface OnboardingShootingSectionProps {
  watch: UseFormWatch<OnboardingFormData>;
  setValue: UseFormSetValue<OnboardingFormData>;
}

export default function OnboardingShootingSection({
  watch,
  setValue,
}: OnboardingShootingSectionProps) {
  const dailyDriverBody = watch('dailyDriverBody') || '';
  const dailyDriverLens = watch('dailyDriverLens') || '';

  const commitBody = useCallback((text: string, catalogId: string | null) => {
    setValue('dailyDriverBody', text);
    setValue('dailyDriverBodyCatalogId', catalogId);
  }, [setValue]);

  const commitLens = useCallback((text: string, catalogId: string | null) => {
    setValue('dailyDriverLens', text);
    setValue('dailyDriverLensCatalogId', catalogId);
  }, [setValue]);

  return (
    <div
      className="space-y-8"
    >
      <div>
        <OnboardingSectionTitle
          icon={PhotoCameraSVG}
        >
          Your shooting style
          <span
            className="ml-0.5 font-normal text-foreground/50"
          >
            (optional)
          </span>
        </OnboardingSectionTitle>
        <Container
          className="onboarding-rise-in onboarding-rise-in-delay-3"
        >
          <div
            className="space-y-4"
          >
            <p
              className="text-sm text-foreground/80"
            >
              Show off your shooting style on your profile and find others with similar styles.
            </p>
            <ShootingFormatTiles
              layout="compact"
              otherInputId="onboarding-shooting-format-other"
              formats={(watch('shootingFormats') || []) as ShootingFormat[]}
              formatsOther={watch('formatsOther') || ''}
              onFormatsChange={(next) => setValue('shootingFormats', next)}
              onFormatsOtherChange={(value) => setValue('formatsOther', value)}
            />
          </div>
        </Container>
      </div>

      <div>
        <OnboardingSectionTitle
          icon={CameraLensSVG}
        >
          Daily driver
          <span
            className="ml-0.5 font-normal text-foreground/50"
          >
            (optional)
          </span>
        </OnboardingSectionTitle>
        <Container
          className="onboarding-rise-in onboarding-rise-in-delay-3"
        >
          <div
            className="space-y-4"
          >
            <p
              className="text-sm text-foreground/80"
            >
              What do you reach for most often? These show on your profile when filled in.
            </p>
            <div
              className="flex flex-col gap-4"
            >
              <DailyDriverField
                id="onboarding-daily-driver-body"
                label={GEAR_CATEGORY_LABELS.camera_body}
                placeholder="e.g. Fujifilm X-T5"
                category="camera_body"
                value={dailyDriverBody}
                peerItems={[]}
                onCommit={commitBody}
              />
              <DailyDriverField
                id="onboarding-daily-driver-lens"
                label={GEAR_CATEGORY_LABELS.lens}
                placeholder="e.g. XF 35mm F1.4"
                category="lens"
                value={dailyDriverLens}
                peerItems={[]}
                onCommit={commitLens}
              />
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
}
