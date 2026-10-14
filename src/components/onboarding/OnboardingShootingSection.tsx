'use client';

import type { OnboardingFormData } from '@/app/onboarding/onboardingSchema';
import Container from '@/components/layout/Container';
import ShootingFormatTiles from '@/components/gear/ShootingFormatTiles';
import OnboardingSectionTitle from '@/components/onboarding/OnboardingSectionTitle';
import type { ShootingFormat } from '@/lib/gear/types';
import { UseFormSetValue, UseFormWatch } from 'react-hook-form';
import PhotoCameraSVG from 'public/icons/photo-camera.svg';

interface OnboardingShootingSectionProps {
  watch: UseFormWatch<OnboardingFormData>;
  setValue: UseFormSetValue<OnboardingFormData>;
}

export default function OnboardingShootingSection({
  watch,
  setValue,
}: OnboardingShootingSectionProps) {
  return (
    <div>
      <OnboardingSectionTitle
        icon={PhotoCameraSVG}
      >
        How you shoot
        <span
          className="ml-1.5 text-xs font-normal text-foreground/50"
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
            Shown on your profile when you pick at least one. You can add gear and daily drivers later under My gear.
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
  );
}
